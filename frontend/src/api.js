const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Custom fetch wrapper with standard error handling.
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${endpoint}`;
    
    // Default headers to JSON
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { detail: 'An unexpected error occurred.' };
        }
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'API error');
    }

    // Return empty for 204 No Content
    if (response.status === 204) {
        return null;
    }

    return response.json();
}

export const api = {
    // 1. Components Endpoints
    getComponents: () => apiFetch('components/'),
    createComponent: (data) => apiFetch('components/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateComponent: (id, data) => apiFetch(`components/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    deleteComponent: (id) => apiFetch(`components/${id}/`, {
        method: 'DELETE',
    }),

    // 2. Vehicles Endpoints
    getVehicles: () => apiFetch('vehicles/'),
    createVehicle: (data) => apiFetch('vehicles/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    deleteVehicle: (id) => apiFetch(`vehicles/${id}/`, {
        method: 'DELETE',
    }),

    // 3. Repair Jobs Endpoints
    getRepairJobs: () => apiFetch('repair-jobs/'),
    createRepairJob: (data) => apiFetch('repair-jobs/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getRepairJobDetails: (id) => apiFetch(`repair-jobs/${id}/`),
    updateRepairJob: (id, data) => apiFetch(`repair-jobs/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteRepairJob: (id) => apiFetch(`repair-jobs/${id}/`, {
        method: 'DELETE',
    }),
    payRepairJob: (id, paymentMethod = 'Credit Card') => apiFetch(`repair-jobs/${id}/pay/`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: paymentMethod }),
    }),

    // 4. Issues Endpoints
    createIssue: (data) => apiFetch('issues/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    deleteIssue: (id) => apiFetch(`issues/${id}/`, {
        method: 'DELETE',
    }),

    // 5. Revenue Analytics reports
    getRevenueAnalytics: () => apiFetch('revenue-analytics/'),
};
