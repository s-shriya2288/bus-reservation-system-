let isLoggedIn = false;
let currentUser = '';
let isLoginMode = true;
const API_URL = '/cgi-bin/api.cgi';
let allBuses = []; // Cash all buses for filtering

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('search-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    fetchBuses();

    // Auth Modal Logic
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('close-modal');
    const toggleBtn = document.getElementById('toggle-auth-btn');
    const authForm = document.getElementById('auth-form');
    const greeting = document.getElementById('user-greeting');

    // Booking modal logic
    const bookingModal = document.getElementById('booking-modal');
    const closeBookingBtn = document.getElementById('close-booking-modal');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');

    // My Bookings modal logic
    const myBookingsBtn = document.getElementById('my-bookings-btn');
    const bookingsModal = document.getElementById('bookings-modal');
    const closeBookingsBtn = document.getElementById('close-bookings-modal');

    closeBookingBtn.addEventListener('click', () => { bookingModal.style.display = 'none'; });

    myBookingsBtn.addEventListener('click', () => {
        renderBookings();
        bookingsModal.style.display = 'flex';
    });

    closeBookingsBtn.addEventListener('click', () => { bookingsModal.style.display = 'none'; });

    confirmBookingBtn.addEventListener('click', async () => {
        const busId = confirmBookingBtn.dataset.busId;
        const seatId = confirmBookingBtn.dataset.seat;
        await finalizeBooking(busId, seatId);
    });

    const savedUser = localStorage.getItem('safar_user');
    if (savedUser) {
        isLoggedIn = true;
        currentUser = savedUser;
        updateAuthUI();
    }

    authBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            isLoggedIn = false; currentUser = ''; localStorage.removeItem('safar_user');
            updateAuthUI(); showNotification('Logged out successfully');
        } else {
            authModal.style.display = 'flex';
        }
    });

    closeBtn.addEventListener('click', () => { authModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.style.display = 'none';
        if (e.target === bookingModal) bookingModal.style.display = 'none';
        if (e.target === document.getElementById('mock-google-modal')) document.getElementById('mock-google-modal').style.display = 'none';
        if (e.target === bookingsModal) bookingsModal.style.display = 'none';
    });

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        document.getElementById('modal-title').textContent = isLoginMode ? 'Sign in to Safar' : 'Create an Account';
        document.getElementById('auth-submit-btn').textContent = isLoginMode ? 'Sign In' : 'Register';
        document.getElementById('toggle-text').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleBtn.textContent = isLoginMode ? "Register" : "Sign in";
    });

    document.getElementById('google-login-btn').addEventListener('click', () => {
        document.getElementById('mock-google-modal').style.display = 'flex';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const action = isLoginMode ? 'login' : 'register';

        try {
            await new Promise(res => setTimeout(res, 400));
            let data = { status: 'error', message: 'Unknown error' };
            let users = JSON.parse(localStorage.getItem('safar_users')) || {};
            
            if (action === 'register') {
                if (users[u]) {
                    data = { status: 'error', message: 'Username already exists!' };
                } else {
                    users[u] = p;
                    localStorage.setItem('safar_users', JSON.stringify(users));
                    data = { status: 'success', message: 'Registered successfully!' };
                }
            } else {
                if (users[u] && users[u] === p) {
                    data = { status: 'success', message: 'Login successful!', username: u };
                } else {
                    data = { status: 'error', message: 'Invalid credentials!' };
                }
            }

            if (data.status === 'success') {
                showNotification(data.message);
                if (isLoginMode) {
                    isLoggedIn = true; currentUser = data.username || u; localStorage.setItem('safar_user', currentUser);
                    updateAuthUI(); authModal.style.display = 'none'; authForm.reset();
                } else {
                    toggleBtn.click(); // switch to login
                }
            } else showNotification(data.message);
        } catch (err) { showNotification('Network error.'); }
    });

    function updateAuthUI() {
        const bookingsBtn = document.getElementById('my-bookings-btn');
        if (isLoggedIn) {
            greeting.style.display = 'inline'; greeting.textContent = `Hi, ${currentUser}`;
            authBtn.textContent = 'Log out'; authBtn.className = 'btn-outline';
            if (bookingsBtn) bookingsBtn.style.display = 'inline-block';
        } else {
            greeting.style.display = 'none';
            authBtn.textContent = 'Log in / Sign up'; authBtn.className = 'btn-primary';
            if (bookingsBtn) bookingsBtn.style.display = 'none';
        }
    }

    // Listeners for filter changes
    document.querySelectorAll('.type-filter').forEach(chk => {
        chk.addEventListener('change', () => renderBuses(allBuses));
    });

    ['search-from', 'search-to'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', e => {
            if (e.key === 'Enter') triggerSearch();
        });
    });
});

window.swapLocations = () => {
    const fromInput = document.getElementById('search-from');
    const toInput = document.getElementById('search-to');
    const temp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = temp;
    triggerSearch();
};

window.triggerSearch = () => {
    const from = document.getElementById('search-from').value;
    const to = document.getElementById('search-to').value;
    fetchBuses(from, to);

    const title = document.getElementById('results-title');
    if (from && to) title.textContent = `${from} to ${to}`;
    else if (from) title.textContent = `Buses from ${from}`;
    else if (to) title.textContent = `Buses to ${to}`;
    else title.textContent = `Available Buses`;
};

const mockBuses = [
    { id: 1, type: "AC Sleeper", name: "Delhi Express", from: "Delhi", to: "Jaipur", time: "10:00 AM", price: 800, available_seats: 39 },
    { id: 2, type: "AC Semi-Sleeper", name: "Rajdhani Bus", from: "Mumbai", to: "Pune", time: "11:30 AM", price: 650, available_seats: 12 },
    { id: 3, type: "Volvo AC", name: "Southern Travels", from: "Bangalore", to: "Chennai", time: "08:00 PM", price: 1200, available_seats: 10 },
    { id: 4, type: "Non-AC Seater", name: "Himalayan Route", from: "Chandigarh", to: "Shimla", time: "06:00 AM", price: 400, available_seats: 25 },
    { id: 5, type: "AC Sleeper", name: "Tech Corridor", from: "Hyderabad", to: "Vijayawada", time: "09:00 PM", price: 900, available_seats: 8 },
    { id: 6, type: "AC Seater", name: "DTC AC Spl", from: "Delhi", to: "Noida", time: "08:30 AM", price: 150, available_seats: 45 },
    { id: 7, type: "AC Seater", name: "BEST AC King", from: "Mumbai", to: "Navi Mumbai", time: "09:15 AM", price: 120, available_seats: 22 },
    { id: 8, type: "Volvo AC", name: "BMTC Volvo", from: "Bangalore", to: "Mysore", time: "07:45 AM", price: 350, available_seats: 35 },
    { id: 9, type: "Non-AC Seater", name: "MTC Deluxe", from: "Chennai", to: "Pondicherry", time: "04:30 PM", price: 250, available_seats: 15 },
    { id: 10, type: "AC Sleeper", name: "Jaipur Express", from: "Jaipur", to: "Delhi", time: "02:00 PM", price: 800, available_seats: 38 },
    { id: 11, type: "AC Semi-Sleeper", name: "Pune Fastlink", from: "Pune", to: "Mumbai", time: "03:30 PM", price: 650, available_seats: 15 },
    { id: 12, type: "Volvo AC", name: "Kaveri Travels", from: "Chennai", to: "Bangalore", time: "09:00 PM", price: 1200, available_seats: 18 },
    { id: 13, type: "Non-AC Seater", name: "Shimla Flyer", from: "Shimla", to: "Chandigarh", time: "12:00 PM", price: 400, available_seats: 10 },
    { id: 14, type: "AC Sleeper", name: "Andhra Express", from: "Vijayawada", to: "Hyderabad", time: "06:00 AM", price: 900, available_seats: 30 },
    { id: 15, type: "Volvo AC", name: "Shatabdi Bus", from: "Delhi", to: "Mumbai", time: "05:00 PM", price: 2500, available_seats: 45 },
    { id: 16, type: "Volvo AC", name: "Shatabdi Bus", from: "Mumbai", to: "Delhi", time: "06:00 PM", price: 2500, available_seats: 42 },
    { id: 17, type: "AC Semi-Sleeper", name: "KSTDC Connect", from: "Bangalore", to: "Goa", time: "07:00 AM", price: 1500, available_seats: 50 },
    { id: 18, type: "AC Semi-Sleeper", name: "KSTDC Connect", from: "Goa", to: "Bangalore", time: "05:00 PM", price: 1500, available_seats: 48 },
    { id: 19, type: "AC Sleeper", name: "RedBus Special", from: "Delhi", to: "Manali", time: "05:30 PM", price: 1800, available_seats: 20 }
];

async function fetchBuses(fromStr = '', toStr = '') {
    const busContainer = document.getElementById('bus-container');
    const loader = document.getElementById('loader');

    busContainer.innerHTML = '';
    loader.style.display = 'block';

    try {
        await new Promise(res => setTimeout(res, 400)); // Mock network delay
        
        let filtered = [...mockBuses];
        if (fromStr) filtered = filtered.filter(b => b.from.toLowerCase().includes(fromStr.toLowerCase()));
        if (toStr) filtered = filtered.filter(b => b.to.toLowerCase().includes(toStr.toLowerCase()));

        allBuses = filtered;
        renderBuses(allBuses);
    } catch (error) {
        showNotification('Unable to fetch live operators.');
    } finally {
        loader.style.display = 'none';
    }
}

function renderBuses(buses) {
    const container = document.getElementById('bus-container');
    container.innerHTML = '';

    // Apply filters
    const selectedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(chk => chk.value);

    let filtered = buses;
    if (selectedTypes.length > 0) {
        filtered = buses.filter(b => selectedTypes.includes(b.type));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div style="padding: 2rem; text-align:center; background:#fff; border-radius:8px; border:1px solid #ddd; font-weight: 600;">No buses found for this search/filter combination.</div>';
        return;
    }

    filtered.forEach(bus => {
        const card = document.createElement('div');
        card.className = 'bus-card';
        card.innerHTML = `
            <div class="bus-info-top">
                <div>
                    <div class="operator-name">${bus.name}</div>
                    <div class="bus-type-badge">${bus.type}</div>
                </div>
                <div class="price-action">
                    <div class="price">${bus.price}</div>
                </div>
            </div>
            
            <div class="route-info">
                <div class="time-city">
                    <span class="time-val">${bus.time}</span>
                    <span class="city-val">${bus.from}</span>
                </div>
                <div class="connector"></div>
                <div class="time-city">
                    <span class="time-val">--:--</span>
                    <span class="city-val">${bus.to}</span>
                </div>
            </div>
            
            <div class="card-footer">
                <div class="seats-warning ${bus.available_seats <= 10 ? 'low' : ''}">
                    ${bus.available_seats} Seats Available
                </div>
                <button class="btn-view-seats" onclick="toggleSeatsDrawer(${bus.id})">
                    View Seats
                </button>
            </div>
            
            <div class="seat-drawer" id="drawer-${bus.id}">
                ${generateSeatDrawerHTML(bus)}
            </div>
        `;
        container.appendChild(card);
    });
}

function generateSeatDrawerHTML(bus) {
    let seatsHTML = '';
    const totalSeats = 36;
    const bookedSeats = new Set();

    // Randomly mock some booked seats based on availability difference
    const mockBookedCount = totalSeats - bus.available_seats;
    while (bookedSeats.size < mockBookedCount && mockBookedCount > 0) {
        bookedSeats.add(Math.floor(Math.random() * totalSeats) + 1);
    }

    for (let i = 1; i <= totalSeats; i++) {
        let isBooked = bookedSeats.has(i) ? 'booked' : '';
        seatsHTML += `<div class="seat ${isBooked}" id="seat-${bus.id}-${i}" onclick="selectSeat(${bus.id}, ${i}, ${bus.price}, '${bus.name}', ${bookedSeats.has(i)})">${i}</div>`;
        if (i % 4 === 2) {
            seatsHTML += `<div class="spacer" style="width: 20px;"></div>`;
        }
        if (i % 4 === 0) {
            seatsHTML += `<div style="flex-basis: 100%; height: 0;"></div>`;
        }
    }

    return `
        <div class="seat-drawer-header">
            <h4>Select your seat</h4>
            <span class="close-drawer" onclick="toggleSeatsDrawer(${bus.id})">&times;</span>
        </div>
        <div class="seat-layout">
            <div class="bus-layout-outline">
                <div class="driver-wheel"></div>
                <div class="seat-grid">
                    ${seatsHTML}
                </div>
            </div>
            <div class="booking-action-panel">
                <h4>Booking Summary</h4>
                <div class="selected-seat-info" id="seat-info-${bus.id}">Select a seat to proceed.</div>
                <button class="btn-continue" id="btn-continue-${bus.id}" disabled onclick="openBookingModal(${bus.id}, '${bus.name}')">Continue</button>
            </div>
        </div>
    `;
}

window.toggleSeatsDrawer = (busId) => {
    const drawer = document.getElementById(`drawer-${busId}`);
    if (drawer.style.display === 'block') {
        drawer.style.display = 'none';
    } else {
        // Close all other drawers
        document.querySelectorAll('.seat-drawer').forEach(d => d.style.display = 'none');
        drawer.style.display = 'block';
    }
};

window.selectedSeats = {};

window.selectSeat = (busId, seatNum, price, busName, isBooked) => {
    if (isBooked) return;

    // Deselect previously selected seat in this bus
    document.querySelectorAll(`#drawer-${busId} .seat.selected`).forEach(s => s.classList.remove('selected'));

    // Select new seat
    const seatElem = document.getElementById(`seat-${busId}-${seatNum}`);
    seatElem.classList.add('selected');

    window.selectedSeats[busId] = { num: seatNum, price: price, name: busName };

    document.getElementById(`seat-info-${busId}`).innerHTML = `
        <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Seat ${seatNum}</div>
        <div style="color: var(--text-muted);">Amount: ₹${price}</div>
    `;

    document.getElementById(`btn-continue-${busId}`).disabled = false;
};

window.openBookingModal = (busId, busName) => {
    if (!isLoggedIn) {
        showNotification('Please log in / sign up to book a ticket.');
        document.getElementById('auth-modal').style.display = 'flex';
        return;
    }

    const seatData = window.selectedSeats[busId];
    if (!seatData) return;

    document.getElementById('booking-summary').textContent = `Operator: ${busName} | Fare: ₹${seatData.price}`;
    document.getElementById('selected-seat-label').textContent = `${seatData.num}`;

    const confirmBtn = document.getElementById('confirm-booking-btn');
    confirmBtn.disabled = false;
    confirmBtn.dataset.busId = busId;
    confirmBtn.dataset.seat = seatData.num;

    document.getElementById('booking-modal').style.display = 'flex';
};

async function finalizeBooking(busId, seatId) {
    if (!isLoggedIn) return;

    const confirmBtn = document.getElementById('confirm-booking-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';

    try {
        await new Promise(res => setTimeout(res, 600)); // mock network delay
        
        const bus = mockBuses.find(b => b.id == busId);
        if (!bus || bus.available_seats <= 0) {
            showNotification('No seats available!');
            return;
        }

        bus.available_seats--;
        const result = { status: 'success', message: 'Seat booked successfully!' };

        if (result.status === 'success') {
            const seatData = window.selectedSeats[busId];

            // Save to LocalStorage
            let history = JSON.parse(localStorage.getItem('safar_bookings_' + currentUser)) || [];
            history.unshift({
                bookingId: 'SFA' + Math.floor(Math.random() * 900000 + 100000),
                operator: bus.name,
                route: `${bus.from} ➔ ${bus.to}`,
                dateAndTime: new Date().toLocaleString(),
                price: seatData.price,
                seat: seatId
            });
            localStorage.setItem('safar_bookings_' + currentUser, JSON.stringify(history));

            showNotification(`Ticket Confirmed! Have a wonderful journey.`);
            document.getElementById('booking-modal').style.display = 'none';
            toggleSeatsDrawer(busId);
            fetchBuses(document.getElementById('search-from').value, document.getElementById('search-to').value);
        } else {
            showNotification(result.message);
        }
    } catch (e) {
        showNotification('Failed to communicate with booking servers.');
    } finally {
        confirmBtn.textContent = 'Confirm Booking';
    }
}

function renderBookings() {
    const list = document.getElementById('bookings-list');
    list.innerHTML = '';
    let history = JSON.parse(localStorage.getItem('safar_bookings_' + currentUser)) || [];

    if (history.length === 0) {
        list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted); background: white; border-radius: 8px;">You have no prior bookings. Your upcoming journeys will appear here!</div>';
        return;
    }

    history.forEach(b => {
        list.innerHTML += `
        <div style="border: 1px solid var(--border-light); border-radius: 8px; padding: 1.2rem; margin-bottom: 1rem; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ddd; padding-bottom: 0.8rem; margin-bottom: 0.8rem;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">${b.operator}</div>
                <div style="color: var(--primary); font-weight: bold; background: #ffe4e6; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem;">PNR: ${b.bookingId}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 1rem; font-weight: 600; margin-bottom: 4px;">${b.route}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        Seat <strong style="color: var(--text-main); font-size: 0.95rem;">${b.seat}</strong> &nbsp;•&nbsp; Booked on ${b.dateAndTime}
                    </div>
                </div>
                <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-main);">₹${b.price}</div>
            </div>
        </div>`;
    });
}

function showNotification(msg) {
    const area = document.getElementById('notification-area');
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = msg;
    area.appendChild(notif);

    setTimeout(() => {
        notif.classList.add('fade-out');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

window.mockGoogleLogin = (name, email) => {
    isLoggedIn = true;
    currentUser = name;
    localStorage.setItem('safar_user', currentUser);

    document.getElementById('user-greeting').style.display = 'inline';
    document.getElementById('user-greeting').textContent = `Hi, ${currentUser}`;
    document.getElementById('auth-btn').textContent = 'Log out';
    document.getElementById('auth-btn').className = 'btn-outline';

    document.getElementById('mock-google-modal').style.display = 'none';
    document.getElementById('auth-modal').style.display = 'none';

    showNotification(`Welcome back, ${currentUser}! logged in as ${email}`, 'success');
};
