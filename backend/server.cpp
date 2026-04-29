#include "httplib.h"
#include <iostream>
#include <vector>
#include <string>
#include <mutex>

// Simple struct to represent a seat
struct Seat {
    int id;
    std::string status; // "available" or "occupied"
};

// Simple struct to represent a bus
struct Bus {
    int id;
    std::string route;
    std::vector<Seat> seats;
};

// State
std::vector<Bus> buses;
std::mutex mtx;

// Initialize some dummy data
void initialize_data() {
    Bus b1;
    b1.id = 1;
    b1.route = "NYC to Boston (10:00 AM)";
    for (int i = 1; i <= 40; ++i) {
        b1.seats.push_back({i, i % 7 == 0 ? "occupied" : "available"});
    }
    
    Bus b2;
    b2.id = 2;
    b2.route = "SF to LA (1:00 PM)";
    for (int i = 1; i <= 40; ++i) {
        b2.seats.push_back({i, i % 3 == 0 ? "occupied" : "available"});
    }
    
    buses.push_back(b1);
    buses.push_back(b2);
}

// Very basic JSON generator for Bus object
std::string bus_to_json(const Bus& bus) {
    std::string json = "{";
    json += "\"id\": " + std::to_string(bus.id) + ",";
    json += "\"route\": \"" + bus.route + "\",";
    json += "\"seats\": [";
    for (size_t i = 0; i < bus.seats.size(); ++i) {
        json += "{";
        json += "\"id\": " + std::to_string(bus.seats[i].id) + ",";
        json += "\"status\": \"" + bus.seats[i].status + "\"";
        json += "}";
        if (i < bus.seats.size() - 1) json += ",";
    }
    json += "]}";
    return json;
}

int main(void) {
    // 1. Initialize our dummy database
    initialize_data();
    
    // 2. Setup HTTP Server
    httplib::Server svr;

    // 3. Serve Frontend Files
    // The mount function maps a URL prefix to a local directory
    auto ret = svr.set_mount_point("/", "../frontend");
    if (!ret) {
        std::cerr << "Warning: The base directory was not mapped perfectly. Make sure you run from the backend directory." << std::endl;
    }

    // 4. API Endpoints
    svr.Get(R"(/api/buses/(\d+))", [&](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(mtx);
        int id = std::stoi(req.matches[1]);
        
        bool found = false;
        for (const auto& bus : buses) {
            if (bus.id == id) {
                res.set_content(bus_to_json(bus), "application/json");
                found = true;
                break;
            }
        }
        
        if (!found) {
            res.status = 404;
            res.set_content("{\"error\": \"Bus not found\"}", "application/json");
        }
    });

    svr.Post("/api/book", [&](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(mtx);
        // Simple manual JSON parsing (For a production system, use nlohmann/json!)
        std::string body = req.body;
        
        // Extract busId
        size_t busPos = body.find("\"busId\":");
        int busId = -1;
        if (busPos != std::string::npos) {
            size_t start = busPos + 8;
            size_t end = body.find(",", start);
            try {
                busId = std::stoi(body.substr(start, end - start));
            } catch (...) { busId = -1; }
        }
        
        // Extract seats array
        std::vector<int> requestedSeats;
        size_t seatsPos = body.find("\"seats\":[");
        if (seatsPos != std::string::npos) {
            size_t start = seatsPos + 9;
            size_t end = body.find("]", start);
            std::string arrayStr = body.substr(start, end - start);
            
            // split by comma
            size_t pos = 0;
            while ((pos = arrayStr.find(",")) != std::string::npos) {
                try { requestedSeats.push_back(std::stoi(arrayStr.substr(0, pos))); } catch(...) {}
                arrayStr.erase(0, pos + 1);
            }
            if (!arrayStr.empty()) {
                try { requestedSeats.push_back(std::stoi(arrayStr)); } catch(...) {}
            }
        }
        
        if (busId == -1 || requestedSeats.empty()) {
            res.status = 400;
            res.set_content("{\"success\": false, \"message\": \"Invalid payload\"}", "application/json");
            return;
        }

        // Check availability and book
        bool success = false;
        std::string msg = "Bus not found";
        
        for (auto& bus : buses) {
            if (bus.id == busId) {
                // First check if all requested seats are available
                bool allAvailable = true;
                for (int sid : requestedSeats) {
                    bool validSeat = false;
                    for (auto& seat : bus.seats) {
                        if (seat.id == sid) {
                            validSeat = true;
                            if (seat.status == "occupied") {
                                allAvailable = false;
                            }
                            break;
                        }
                    }
                    if (!validSeat || !allAvailable) {
                        allAvailable = false;
                        break;
                    }
                }
                
                if (allAvailable) {
                    // Preform Booking
                    for (int sid : requestedSeats) {
                        for (auto& seat : bus.seats) {
                            if (seat.id == sid) {
                                seat.status = "occupied";
                                break;
                            }
                        }
                    }
                    success = true;
                    msg = "Seats booked successfully";
                } else {
                    success = false;
                    msg = "One or more seats are already booked.";
                }
                break;
            }
        }

        if (success) {
            res.set_content("{\"success\": true, \"message\": \"" + msg + "\"}", "application/json");
        } else {
            res.set_content("{\"success\": false, \"message\": \"" + msg + "\"}", "application/json");
        }
    });

    std::cout << "Starting Antigravity Bus Server on http://localhost:8080..." << std::endl;
    svr.listen("0.0.0.0", 8080);
    return 0;
}
