document.addEventListener('DOMContentLoaded', () => {
    const seatMap = document.getElementById('seat-map');
    const routeSelect = document.getElementById('route-select');
    const reservationSummary = document.getElementById('reservation-summary');
    const passengerNameInput = document.getElementById('passenger-name');
    const bookBtn = document.getElementById('book-btn');
    const statusMessage = document.getElementById('status-message');

    let currentBusId = 1;
    let selectedSeats = [];
    let seatData = [];

    // Initialize layout
    seatMap.classList.add('bus-layout');

    // Fetch bus details from C++ backend
    async function fetchBusDetails() {
        currentBusId = routeSelect.value;
        try {
            const response = await fetch(`/api/buses/${currentBusId}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Expected format: { id: 1, route: "...", seats: [{id: 1, status: "available"}, ...] }
            seatData = data.seats || [];
            selectedSeats = [];
            renderSeats();
            updateSummary();
            updateStatus('', '');
        } catch (error) {
            console.error('Error fetching bus info:', error);
            // Fallback for UI visualization testing when backend is not running
            seatData = generateMockSeats();
            renderSeats();
            updateStatus('Warning: Using offline mock data', 'error');
        }
    }

    // Mock data if backend fails
    function generateMockSeats() {
        const mock = [];
        for (let i = 1; i <= 40; i++) {
            mock.push({
                id: i,
                status: Math.random() > 0.8 ? 'occupied' : 'available'
            });
        }
        return mock;
    }

    function renderSeats() {
        seatMap.innerHTML = '';
        
        let colCounter = 0;
        
        seatData.forEach((seat, index) => {
            // Aisle logic (after 2 seats)
            if (colCounter === 2) {
                const aisle = document.createElement('div');
                aisle.className = 'aisle-spacer';
                seatMap.appendChild(aisle);
                colCounter++;
            }

            const seatEl = document.createElement('div');
            seatEl.classList.add('seat');
            seatEl.classList.add(seat.status);
            seatEl.innerText = seat.id;
            seatEl.dataset.id = seat.id;

            if (seat.status === 'available') {
                seatEl.addEventListener('click', () => toggleSeat(seatEl, seat.id));
            }

            seatMap.appendChild(seatEl);
            
            colCounter++;
            if (colCounter >= 5) {
                colCounter = 0; // Reset for next row
            }
        });
    }

    function toggleSeat(seatEl, seatId) {
        if (selectedSeats.includes(seatId)) {
            selectedSeats = selectedSeats.filter(id => id !== seatId);
            seatEl.classList.remove('selected');
        } else {
            if (selectedSeats.length >= 4) {
                updateStatus('You can only select up to 4 seats.', 'error');
                return;
            }
            selectedSeats.push(seatId);
            seatEl.classList.add('selected');
            updateStatus('', '');
        }
        updateSummary();
    }

    function updateSummary() {
        if (selectedSeats.length === 0) {
            reservationSummary.innerHTML = '<p class="empty-state">No seats selected yet.</p>';
            bookBtn.disabled = true;
            return;
        }

        let html = '';
        selectedSeats.forEach(id => {
            html += `<div class="selected-seat-item">
                        <span>Seat ${id}</span>
                        <span>$25.00</span>
                     </div>`;
        });
        
        const total = selectedSeats.length * 25.00;
        html += `<div class="selected-seat-item" style="border-top: 1px solid rgba(255,255,255,0.2); margin-top: 1rem; font-weight: bold;">
                    <span>Total</span>
                    <span>$${total.toFixed(2)}</span>
                 </div>`;
                 
        reservationSummary.innerHTML = html;
        checkFormValidity();
    }

    function checkFormValidity() {
        const name = passengerNameInput.value.trim();
        bookBtn.disabled = !(selectedSeats.length > 0 && name.length > 0);
    }

    function updateStatus(msg, type) {
        statusMessage.textContent = msg;
        statusMessage.className = 'status-msg ' + type;
    }

    passengerNameInput.addEventListener('input', checkFormValidity);

    routeSelect.addEventListener('change', fetchBusDetails);

    bookBtn.addEventListener('click', async () => {
        bookBtn.disabled = true;
        bookBtn.textContent = 'Processing...';
        
        const payload = {
            busId: parseInt(currentBusId),
            seats: selectedSeats,
            passengerName: passengerNameInput.value.trim()
        };

        try {
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error('Booking failed');
            
            const result = await response.json();
            
            if (result.success) {
                updateStatus('Booking Confirmed! 🎉', 'success');
                passengerNameInput.value = '';
                // Refresh bus data
                setTimeout(() => {
                    fetchBusDetails();
                    bookBtn.textContent = 'Confirm Booking';
                }, 2000);
            } else {
                updateStatus(result.message || 'Booking failed.', 'error');
                bookBtn.disabled = false;
                bookBtn.textContent = 'Confirm Booking';
            }
        } catch (error) {
            updateStatus('Server error. Could not book seats.', 'error');
            console.error('Booking error:', error);
            bookBtn.disabled = false;
            bookBtn.textContent = 'Confirm Booking';
        }
    });

    // Initial load
    fetchBusDetails();
});
