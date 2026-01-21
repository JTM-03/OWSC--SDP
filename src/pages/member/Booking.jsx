import React, { useState, useEffect } from 'react';
import { venues } from '../../data/mockData';
import './Booking.css';

const Booking = () => {
  const [filters, setFilters] = useState({
    type: 'All',
    guests: 1,
    date: ''
  });
  const [filteredVenues, setFilteredVenues] = useState(venues);

  useEffect(() => {
    let result = venues;

    // Filter by Type
    if (filters.type !== 'All') {
      result = result.filter(v => v.type === filters.type);
    }

    // Filter by Guests
    result = result.filter(v => v.capacity >= filters.guests);

    setFilteredVenues(result);
  }, [filters]);

  const handleBook = (venueId) => {
    alert(`Booking flow for Venue ID: ${venueId} initiated.`);
  };

  return (
    <div className="booking-page">
      <aside className="booking-filters">
        <div className="filter-card">
          <h3>Find a Space</h3>

          <div className="filter-group">
            <label>Date</label>
            <input
              type="date"
              className="filter-input"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Guests</label>
            <input
              type="number"
              min="1"
              max="100"
              className="filter-input"
              value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="filter-group">
            <label>Venue Type</label>
            <select
              className="filter-input"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="All">All Types</option>
              <option value="Lounge">Lounge</option>
              <option value="Private Room">Private Room</option>
              <option value="Outdoor">Outdoor</option>
            </select>
          </div>

          <div className="results-count">
            {filteredVenues.length} Venues Available
          </div>
        </div>
      </aside>

      <div className="booking-grid">
        {filteredVenues.length > 0 ? (
          filteredVenues.map(venue => (
            <div key={venue.id} className="venue-card">
              <div className="venue-image-wrapper">
                <img src={venue.image} alt={venue.name} className="venue-image" />
                {!venue.available && <div className="availability-tag booked">Booked</div>}
              </div>
              <div className="venue-details">
                <div className="venue-header">
                  <h3>{venue.name}</h3>
                  <span className="venue-price">\${venue.price}</span>
                </div>
                <div className="venue-meta">
                  <span>👥 {venue.capacity} Guests</span>
                  <span>📍 {venue.type}</span>
                </div>
                <p className="venue-description">{venue.description}</p>
                <button
                  className="book-btn"
                  disabled={!venue.available}
                  onClick={() => handleBook(venue.id)}
                >
                  {venue.available ? 'Book Now' : 'Unavailable'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <h3>No venues found</h3>
            <p>Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
