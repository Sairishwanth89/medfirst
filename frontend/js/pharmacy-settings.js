// Pharmacy Settings/Profile JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const authToken = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!authToken || !currentUser || currentUser.role !== 'pharmacy') {
        window.location.href = 'index.html';
        return;
    }

    loadPharmacyProfile();
});

async function loadPharmacyProfile() {
    try {
        const response = await fetch('http://localhost:8000/api/pharmacies/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            const pharmacy = await response.json();
            populatePharmacyData(pharmacy);
        }
    } catch (error) {
        console.error('Error loading pharmacy profile:', error);
    }
}

function populatePharmacyData(pharmacy) {
    // Business Information
    document.getElementById('pharmacy-name').value = pharmacy.name || 'MediAgency';
    document.getElementById('contact-phone').value = pharmacy.phone || '';
    document.getElementById('full-address').value = pharmacy.address || '';

    // Profile card
    if (pharmacy.name) {
        document.querySelector('.profile-card h3').textContent = pharmacy.name;
    }
}

function enableEdit(section) {
    let formId, saveButtonId;

    if (section === 'business') {
        formId = 'business-info-form';
        saveButtonId = 'business-save';
    } else if (section === 'hours') {
        formId = 'operating-hours-form';
        saveButtonId = 'hours-save';
    } else if (section === 'bank') {
        formId = 'bank-details-form';
        saveButtonId = 'bank-save';
    }

    // Enable all inputs in the form
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.disabled = false;
        input.style.background = 'white';
    });

    // Show save button
    document.getElementById(saveButtonId).style.display = 'block';
}

// Handle Business Info form submission
document.getElementById('business-info-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const pharmacyData = {
        name: document.getElementById('pharmacy-name').value,
        phone: document.getElementById('contact-phone').value,
        address: document.getElementById('full-address').value
    };

    try {
        const response = await fetch('http://localhost:8000/api/pharmacies/me', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(pharmacyData)
        });

        if (response.ok) {
            alert('Business information updated successfully!');

            // Disable inputs again
            const form = document.getElementById('business-info-form');
            const inputs = form.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.disabled = true;
                input.style.background = '#F9FAFB';
            });

            // Hide save button
            document.getElementById('business-save').style.display = 'none';
        } else {
            alert('Failed to update business information');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update business information');
    }
});

// Handle Operating Hours form submission
document.getElementById('operating-hours-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Operating hours updated successfully!');

    // Disable inputs again
    const form = document.getElementById('operating-hours-form');
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.background = '#F9FAFB';
    });

    // Hide save button
    document.getElementById('hours-save').style.display = 'none';
});

// Handle Bank Details form submission
document.getElementById('bank-details-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Bank details updated successfully!');

    // Disable inputs again
    const form = document.getElementById('bank-details-form');
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.background = '#F9FAFB';
    });

    // Hide save button
    document.getElementById('bank-save').style.display = 'none';
});

// Make enableEdit globally accessible
window.enableEdit = enableEdit;
