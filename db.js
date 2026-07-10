// ==========================================
// SUPABASE CONFIGURATION
// Replace these with your actual Supabase URL and Anon Key
// ==========================================
const SUPABASE_URL = 'https://pzvmwrdrdautrwtpnysp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hcG5GDFxqCvpnsWdltjZJQ_AyzFQ-op';

let sbClient = null;

// Initialize Supabase if keys are provided
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
    // The Supabase SDK script exposes the global 'supabase' variable
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized");
} else {
    console.warn("Supabase keys not configured. Falling back to LocalStorage.");
}

const TABLE_NAME = 'progress';

async function fetchProgress() {
    if (sbClient) {
        try {
            const { data, error } = await sbClient.from(TABLE_NAME).select('*');
            if (error) throw error;
            
            // Convert to a dictionary for easy lookup
            const progressMap = {};
            data.forEach(item => {
                progressMap[item.date] = {
                    completed: item.completed,
                    subject_status: item.subject_status || {},
                    notes: item.notes
                };
            });
            return progressMap;
        } catch (err) {
            console.error("Error fetching from Supabase:", err);
            return getLocalProgress();
        }
    } else {
        return getLocalProgress();
    }
}

async function saveProgress(date, completed, subject_status, notes) {
    // Always save locally as a backup / immediate update
    const localData = getLocalProgress();
    localData[date] = { completed, subject_status, notes };
    localStorage.setItem('akshani_progress', JSON.stringify(localData));

    // Save to Supabase
    if (sbClient) {
        try {
            const { error } = await sbClient
                .from(TABLE_NAME)
                .upsert({ date: date, completed: completed, subject_status: subject_status, notes: notes }, { onConflict: 'date' });
            
            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error saving to Supabase:", err);
            return false;
        }
    }
    return true;
}

function getLocalProgress() {
    const data = localStorage.getItem('akshani_progress');
    return data ? JSON.parse(data) : {};
}
