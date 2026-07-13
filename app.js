let progressData = {};
let myChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch initial data
    progressData = await fetchProgress();

    // Render list
    renderTimetable();

    // Initialize Chart
    initChart();
    updateStats();
    
    // Initialize Countdown
    initCountdown();
});

function initCountdown() {
    // Exam Date: August 10, 2026
    const examDate = new Date('2026-08-10T00:00:00').getTime();

    const updateTimer = () => {
        const now = new Date().getTime();
        const distance = examDate - now;

        if (distance < 0) {
            document.getElementById('countdownTimer').innerHTML = `<div style="padding:1rem; font-weight:700; color:var(--highlight); font-size:1.2rem;">Good Luck! 🎓</div>`;
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('cd-days').textContent = days.toString().padStart(2, '0');
        document.getElementById('cd-hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('cd-mins').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('cd-secs').textContent = seconds.toString().padStart(2, '0');
    };

    updateTimer();
    setInterval(updateTimer, 1000);
}

function renderTimetable() {
    const todayList = document.getElementById('todayList');
    const pendingList = document.getElementById('pendingList');
    todayList.innerHTML = '';
    pendingList.innerHTML = '';

    const todayString = new Date().toISOString().split('T')[0];
    let renderedCount = 0;
    let todayCount = 0;

    timetableData.forEach(day => {
        const dayProgress = progressData[day.date] || {};
        
        // Skip rendering completed cards entirely as requested
        if (dayProgress.completed) return;



        const isToday = day.date === todayString;
        
        let timeClass = '';
        if (!isToday) {
            const todayDate = new Date(todayString);
            const cardDate = new Date(day.date);
            timeClass = cardDate < todayDate ? 'stale' : 'upcoming';
            
            // Skip stale (missed) cards for her view entirely
            if (timeClass === 'stale') return;
        }

        renderedCount++;
        const card = document.createElement('div');
        card.className = `day-card ${isToday ? 'today' : timeClass}`;
        
        const subjectStatus = dayProgress.subject_status || {};
        const notes = dayProgress.notes || '';

        let subjectsHtml = '';
        day.subjects.forEach(subject => {
            const isSubCompleted = subjectStatus[subject] || false;
            subjectsHtml += `
                <div class="subject-row">
                    <span class="subjects">${subject}</span>
                    <label class="checkbox-container">
                        <input type="checkbox" class="task-checkbox" data-date="${day.date}" data-subject="${subject}" ${isSubCompleted ? 'checked' : ''}>
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
                </div>
            </div>
            <div class="card-body">
                ${subjectsHtml}
            </div>
            <div class="notes-container">
                <input type="text" class="notes-input" placeholder="Add a note (e.g. Past papers done!)" value="${notes}" data-date="${day.date}">
                <button class="btn-save" data-date="${day.date}">Save Note</button>
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
        todayList.innerHTML = `<div class="all-caught-up" style="padding: 1.5rem;">No tasks for today, or you've finished them! 🎉</div>`;
    }

    if (renderedCount - todayCount === 0) {
        pendingList.innerHTML = `<div class="all-caught-up" style="padding: 1.5rem;">No pending tasks! 🎉</div>`;
    }

    // Event Listeners for checkboxes and save buttons
    document.querySelectorAll('.task-checkbox').forEach(box => {
        box.addEventListener('change', handleCheck);
    });

    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', handleSaveNote);
    });
}

async function handleCheck(e) {
    const date = e.target.getAttribute('data-date');
    const subject = e.target.getAttribute('data-subject');
    const isCompleted = e.target.checked;
    
    if (!progressData[date]) progressData[date] = { completed: false, subject_status: {}, notes: '' };
    if (!progressData[date].subject_status) progressData[date].subject_status = {};
    
    // Update local state instantly for UI
    progressData[date].subject_status[subject] = isCompleted;

    // Check if ALL subjects for this date are completed
    const dayData = timetableData.find(d => d.date === date);
    const allCompleted = dayData.subjects.every(sub => progressData[date].subject_status[sub]);
    
    const wasAlreadyCompleted = progressData[date].completed;
    progressData[date].completed = allCompleted;

    // Update card styling
    const card = e.target.closest('.day-card');
    
    // If all tasks for the day are complete, animate and remove it
    if (allCompleted && !wasAlreadyCompleted) {
        triggerConfetti();
        showToast();
        
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            card.remove();
            
            // Update empty states
            if (document.querySelectorAll('#todayList .day-card').length === 0) {
                document.getElementById('todayList').innerHTML = `<div class="all-caught-up" style="padding: 1.5rem;">No tasks for today, or you've finished them! 🎉</div>`;
            }
            if (document.querySelectorAll('#pendingList .day-card').length === 0) {
                document.getElementById('pendingList').innerHTML = `<div class="all-caught-up" style="padding: 1.5rem;">No pending tasks! 🎉</div>`;
            }

        }, 500); // Wait for transition
    }

    // Save to DB
    const notes = document.querySelector(`.notes-input[data-date="${date}"]`).value;
    await saveProgress(date, allCompleted, progressData[date].subject_status, notes);

    updateStats();
}

async function handleSaveNote(e) {
    const date = e.target.getAttribute('data-date');
    const input = document.querySelector(`.notes-input[data-date="${date}"]`);
    const notes = input.value;
    
    if (!progressData[date]) progressData[date] = { completed: false, subject_status: {}, notes: '' };

    const btn = e.target;
    btn.textContent = 'Saving...';
    btn.style.opacity = '0.7';

    await saveProgress(date, progressData[date].completed, progressData[date].subject_status, notes);
    
    setTimeout(() => {
        btn.textContent = 'Saved!';
        btn.style.opacity = '1';
        setTimeout(() => btn.textContent = 'Save Note', 2000);
    }, 500);
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

function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff9a9e', '#fecfef', '#38ef7d', '#ff758c']
    });
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
