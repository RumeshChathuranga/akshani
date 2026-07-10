let progressData = {};
let myChart = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('adminPassword');

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});

async function handleLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');

    if (password === 'Ruma@1220') {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        await initDashboard();
    } else {
        errorMsg.style.display = 'block';
    }
}

async function initDashboard() {
    // Fetch initial data
    progressData = await fetchProgress();

    // Render list (showing ALL cards for admin)
    renderTimetable();

    // Initialize Chart
    initChart();
    updateStats();

    // Setup Realtime Listener if Supabase is connected
    if (sbClient) {
        sbClient
            .channel('custom-all-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, async (payload) => {
                console.log('Realtime change received!', payload);
                progressData = await fetchProgress();
                renderTimetable();
                updateStats();
            })
            .subscribe();
    }
}

function renderTimetable() {
    const todayList = document.getElementById('todayList');
    const pendingList = document.getElementById('pendingList');
    todayList.innerHTML = '';
    pendingList.innerHTML = '';

    const todayString = new Date().toISOString().split('T')[0];
    let todayCount = 0;

    timetableData.forEach(day => {
        const dayProgress = progressData[day.date] || {};
        const isDayCompleted = dayProgress.completed || false;
        const isToday = day.date === todayString;
        
        let timeClass = '';
        if (!isToday) {
            const todayDate = new Date(todayString);
            const cardDate = new Date(day.date);
            timeClass = cardDate < todayDate ? 'stale' : 'upcoming';
        }

        const card = document.createElement('div');
        card.className = `day-card ${isToday ? 'today' : timeClass} ${isDayCompleted ? 'completed-card' : ''}`;
        
        const subjectStatus = dayProgress.subject_status || {};
        const notes = dayProgress.notes || '';

        let subjectsHtml = '';
        day.subjects.forEach(subject => {
            const isSubCompleted = subjectStatus[subject] || false;
            subjectsHtml += `
                <div class="subject-row">
                    <span class="subjects">${subject}</span>
                    <label class="checkbox-container">
                        <input type="checkbox" disabled ${isSubCompleted ? 'checked' : ''}>
                        <div class="checkmark"></div>
                        Complete
                    </label>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="card-header">
                <div class="date-info">
                    <h2>${day.displayDate}</h2>
                    <span>Week ${day.week} • ${day.type}</span>
                    ${isToday ? '<span style="background:var(--highlight); color:white;">Today</span>' : ''}
                    ${isDayCompleted ? '<span style="background:var(--success); color:white;">Completed</span>' : ''}
                </div>
            </div>
            <div class="card-body">
                ${subjectsHtml}
            </div>
            <div class="notes-container">
                <input type="text" class="notes-input" placeholder="No notes added" value="${notes}" disabled>
            </div>
        `;

        if (isToday) {
            todayList.appendChild(card);
            todayCount++;
        } else {
            pendingList.appendChild(card);
        }
    });

    if (todayCount === 0) {
        todayList.innerHTML = `<div class="all-caught-up" style="padding: 1.5rem;">No tasks for today.</div>`;
    }
}

function initChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [0, 35],
                backgroundColor: [
                    '#38ef7d', // Success Green
                    '#eee'
                ],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

function updateStats() {
    const total = timetableData.length;
    let completed = 0;

    timetableData.forEach(day => {
        if (progressData[day.date] && progressData[day.date].completed) {
            completed++;
        }
    });

    const remaining = total - completed;
    const percentage = Math.round((completed / total) * 100);

    // Update text
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('remainingCount').textContent = remaining;
    document.getElementById('chartCenterText').textContent = `${percentage}%`;

    // Update chart
    if (myChart) {
        myChart.data.datasets[0].data = [completed, remaining];
        myChart.update();
    }
}
