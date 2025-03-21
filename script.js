// Main application state
const state = {
    processes: [],
    timers: {},
    timerIntervals: {},
    editMode: false,
    editProcessIndex: null,
    activeProcess: null,
    activeSubprocess: null
  };
  
  // DOM Elements
  const processInput = document.getElementById('processInput');
  const addProcessBtn = document.getElementById('addProcessBtn');
  const updateProcessBtn = document.getElementById('updateProcessBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const processTableContainer = document.getElementById('processTableContainer');
  const processTableBody = document.getElementById('processTableBody');
  const recordedTimesContainer = document.getElementById('recordedTimesContainer');
  const recordedTimesTableBody = document.getElementById('recordedTimesTableBody');
  const exportBtn = document.getElementById('exportBtn');
  
  // Mobile detection
  let isMobile = window.innerWidth <= 768;
  
  // Check for mobile on resize
  window.addEventListener('resize', function() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    // If changed between mobile and desktop, re-render
    if (wasMobile !== isMobile) {
      renderInterface();
    }
  });
  
  // Format time in hh:mm:ss format
  function formatTime(time) {
    // Ensure time is a positive value
    time = Math.abs(time);
    
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Format date and time for display
  function formatDateTime(date) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
  
  // Render the appropriate interface based on device
  function renderInterface() {
    if (isMobile) {
      renderMobileView();
    } else {
      renderProcesses();
      renderRecordedTimes();
    }
  }
  
  // Add a new process
  function addProcess() {
    const processName = processInput.value.trim();
    if (!processName) return;
    
    const newProcess = {
      name: processName,
      subprocesses: [],
      active: false,
      timerRunning: false,
      elapsedTime: 0,
      startTime: null,
      lastLapTime: 0,
      readings: []
    };
    
    state.processes.push(newProcess);
    processInput.value = '';
    
    renderInterface();
    processTableContainer.style.display = 'block';
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Start edit process
  function startEditProcess(index) {
    state.editMode = true;
    state.editProcessIndex = index;
    processInput.value = state.processes[index].name;
    addProcessBtn.style.display = 'none';
    updateProcessBtn.style.display = 'inline-block';
    cancelEditBtn.style.display = 'inline-block';
  }
  
  // Save edited process
  function saveEditProcess() {
    const processName = processInput.value.trim();
    if (!processName) return;
    
    state.processes[state.editProcessIndex].name = processName;
    
    processInput.value = '';
    addProcessBtn.style.display = 'inline-block';
    updateProcessBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
    state.editMode = false;
    state.editProcessIndex = null;
    
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Cancel edit
  function cancelEdit() {
    processInput.value = '';
    addProcessBtn.style.display = 'inline-block';
    updateProcessBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
    state.editMode = false;
    state.editProcessIndex = null;
  }
  
  // Delete a process
  function deleteProcess(index) {
    const process = state.processes[index];
    
    // Clear any running timers
    if (state.timerIntervals[process.name]) {
      clearInterval(state.timerIntervals[process.name]);
      delete state.timerIntervals[process.name];
    }
    
    // Remove process
    state.processes.splice(index, 1);
    
    // Clean up timer state
    delete state.timers[process.name];
    
    renderInterface();
    
    if (state.processes.length === 0) {
      processTableContainer.style.display = 'none';
    }
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Add a subprocess to a process
  function addSubprocess(processIndex) {
    const subprocessInputId = `subprocess-input-${processIndex}`;
    const subprocessInput = document.getElementById(subprocessInputId);
    const subprocessName = subprocessInput.value.trim();
    
    if (!subprocessName) return;
    
    const process = state.processes[processIndex];
    
    // Mark the current active subprocess as completed when adding a new one
    if (process.subprocesses.length > 0) {
      const lastSubprocess = process.subprocesses[process.subprocesses.length - 1];
      lastSubprocess.completed = true;
    }
    
    // Add the new subprocess
    process.subprocesses.push({
      name: subprocessName,
      time: 0,
      formattedTime: '00:00:00',
      completed: false,
      activityType: '', // VA or NVA
      remarks: '',      // Remarks
      personCount: 1    // Default number of persons required
    });
    
    subprocessInput.value = '';
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete all readings of a specific subprocess
  function deleteSubprocessReadings(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    const subprocessName = subprocess.name;
    
    // Remove all readings related to this subprocess
    if (process.readings && process.readings.length > 0) {
      process.readings = process.readings.filter(reading => reading.subprocess !== subprocessName);
    }
    
    // Reset the subprocess time display
    subprocess.time = 0;
    subprocess.formattedTime = '00:00:00';
    
    // Re-render the UI
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete the last reading of a specific subprocess
  function deleteLastReading(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    const subprocessName = subprocess.name;
    
    // Find all readings for this subprocess
    if (process.readings && process.readings.length > 0) {
      // Find the indices of all readings for this subprocess
      const readingIndices = [];
      process.readings.forEach((reading, index) => {
        if (reading.subprocess === subprocessName) {
          readingIndices.push(index);
        }
      });
      
      // If there are readings, remove the last one
      if (readingIndices.length > 0) {
        const lastIndex = readingIndices[readingIndices.length - 1];
        process.readings.splice(lastIndex, 1);
        
        // Update the subprocess time display to show the previous reading (if any)
        if (readingIndices.length > 1) {
          const previousIndex = readingIndices[readingIndices.length - 2];
          subprocess.time = process.readings[previousIndex].time;
          subprocess.formattedTime = process.readings[previousIndex].formattedTime;
        } else {
          // If there are no more readings, reset the display
          subprocess.time = 0;
          subprocess.formattedTime = '00:00:00';
        }
      }
    }
    
    // Re-render the UI
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete a specific reading
  function deleteReading(processIndex, readingIndex) {
    const process = state.processes[processIndex];
    
    // Remove the reading
    if (process.readings && process.readings.length > readingIndex) {
      process.readings.splice(readingIndex, 1);
      
      // Re-render tables
      renderInterface();
      
      // Save to localStorage
      saveToLocalStorage();
    }
  }
  
  // Toggle timer for a process
  function toggleTimer(processIndex) {
    const process = state.processes[processIndex];
    
    // First, capture all subprocess data before toggling timer
    if (process.subprocesses && process.subprocesses.length > 0) {
      process.subprocesses.forEach((subprocess, subprocessIndex) => {
        // Get references to the input elements
        let activityTypeElement, remarksElement, personCountElement;
        
        if (isMobile) {
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
        } else {
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
        }
        
        // Save current values to the state if elements exist
        if (activityTypeElement) {
          subprocess.activityType = activityTypeElement.value;
        }
        if (remarksElement) {
          subprocess.remarks = remarksElement.value;
        }
        if (personCountElement) {
          subprocess.personCount = parseInt(personCountElement.value) || 1;
        }
      });
    }
    
    // Now toggle the timer state
    process.timerRunning = !process.timerRunning;
    
    if (process.timerRunning) {
      // Start timer
      process.active = true;
      const now = Date.now();
      
      // Only reset timing values, NOT any other data
      process.startTime = now;
      process.lastLapTime = now;
      
      // Set up interval
      state.timerIntervals[process.name] = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = currentTime - process.startTime;
        
        // Calculate the time difference since the last lap
        const lapTime = currentTime - process.lastLapTime;
        
        state.timers[process.name] = {
          elapsed,
          lapTime: formatTime(lapTime)
        };
        
        updateTimerDisplay(process.name);
        
        // Update mobile timer display if on mobile
        if (isMobile) {
          updateMobileTimerDisplays();
        }
      }, 10);
    } else {
      // Stop timer
      clearInterval(state.timerIntervals[process.name]);
      delete state.timerIntervals[process.name];
      
      // Save elapsed time
      if (state.timers[process.name]) {
        process.elapsedTime = state.timers[process.name].elapsed;
      }
    }
    
    // Re-render the interface
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Update the timer display for a process
  function updateTimerDisplay(processName) {
    const timerDisplay = document.getElementById(`timer-${processName}`);
    if (timerDisplay && state.timers[processName]) {
      // Only show the time since the last lap (time difference)
      timerDisplay.textContent = state.timers[processName].lapTime;
    }
  }
  
  // Reset ONLY timer for a process (preserve readings)
  function resetTimer(processIndex) {
    const process = state.processes[processIndex];
    
    // Clear interval if running
    if (state.timerIntervals[process.name]) {
      clearInterval(state.timerIntervals[process.name]);
      delete state.timerIntervals[process.name];
    }
    
    // Reset only timer state, NOT readings
    process.timerRunning = false;
    process.active = false;
    process.elapsedTime = 0;
    process.startTime = null;
    process.lastLapTime = 0;
    
    // Update timers state
    delete state.timers[process.name];
    
    // Re-render the interface
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Record a lap for a subprocess
  function recordLap(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    
    if (!process.timerRunning || !state.timers[process.name]) return;
    
    // Get additional data
    let activityTypeElement, remarksElement, personCountElement;
    
    if (isMobile) {
      activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
      remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
      personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
    } else {
      activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
      remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
      personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
    }
    
    if (!activityTypeElement || !remarksElement || !personCountElement) {
      console.error("Could not find form elements for subprocess", processIndex, subprocessIndex);
      return;
    }
    
    const activityType = activityTypeElement.value;
    const remarks = remarksElement.value;
    const personCount = parseInt(personCountElement.value) || 1;
    
    // Save the additional data to the subprocess
    subprocess.activityType = activityType;
    subprocess.remarks = remarks;
    subprocess.personCount = personCount;
    
    // Calculate time since last lap (this is the time difference)
    const currentTime = Date.now();
    const lapTime = currentTime - process.lastLapTime;
    
    // Record reading with start and end times
    const startTime = new Date(process.lastLapTime);
    const endTime = new Date(currentTime);
    
    const reading = {
      process: process.name,
      subprocess: subprocess.name,
      time: lapTime,
      formattedTime: formatTime(lapTime),
      timestamp: new Date().toISOString(),
      activityType: activityType,
      remarks: remarks,
      personCount: personCount,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      formattedStartTime: formatDateTime(startTime),
      formattedEndTime: formatDateTime(endTime)
    };
    
    if (!process.readings) {
      process.readings = [];
    }
    
    process.readings.push(reading);
    
    // Update subprocess time
    if (subprocess.time === 0) {
      subprocess.time = lapTime;
      subprocess.formattedTime = formatTime(lapTime);
    } else {
      // For multiple recordings, show the latest lap time
      subprocess.formattedTime = formatTime(lapTime);
    }
    
    // Update last lap time to reset the lap timer
    process.lastLapTime = currentTime;
    
    // Reset the timer display to show we're starting a new lap time difference
    if (state.timers[process.name]) {
      state.timers[process.name].lapTime = '00:00:00';
    }
    updateTimerDisplay(process.name);
    
    state.activeProcess = processIndex;
    state.activeSubprocess = subprocessIndex;
    
    // Show a notification
    showNotification(`Time recorded: ${formatTime(lapTime)}`);
    
    // Re-render the interface
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Export data directly to Excel using SheetJS
  function exportToExcel() {
    // Prepare all process and subprocess readings
    const allReadings = [];
    
    state.processes.forEach(process => {
      if (process.readings && process.readings.length > 0) {
        process.readings.forEach(reading => {
          allReadings.push({
            "Process": process.name,
            "Subprocess": reading.subprocess,
            "Time (hh:mm:ss)": reading.formattedTime,
            "Activity Type": reading.activityType || "",
            "Persons Required": reading.personCount || 1,
            "Remarks": reading.remarks || "",
            "Start Time": reading.formattedStartTime || "",
            "End Time": reading.formattedEndTime || "",
            "Time (ms)": reading.time,
            "Timestamp": new Date(reading.timestamp).toLocaleString()
          });
        });
      }
    });
    
    if (allReadings.length === 0) {
      alert('No data to export!');
      return;
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(allReadings);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Time Motion Study');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, 'time_motion_study.xlsx');
  }
  
  // Save backup data to file
  function saveBackup() {
    const backupData = JSON.stringify({
      processes: state.processes,
      timestamp: new Date().toISOString()
    });
    
    // Create a downloadable file
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-motion-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Save data to localStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem('timeMotionData', JSON.stringify({
        processes: state.processes,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }
  
  // Render the processes table for desktop view
  function renderProcesses() {
    processTableBody.innerHTML = '';
    
    state.processes.forEach((process, processIndex) => {
      // Process Row
      const processRow = document.createElement('tr');
      if (process.active) {
        processRow.className = 'active-row';
      }
      
      processRow.innerHTML = `
        <td>
          <div>${process.name}</div>
          <div class="action-buttons">
            <span class="action-link" onclick="startEditProcess(${processIndex})">Edit</span>
            <span class="action-link delete" onclick="deleteProcess(${processIndex})">Delete</span>
          </div>
        </td>
        <td>
          <div class="timer-display" id="timer-${process.name}">
            ${process.timerRunning && state.timers[process.name] ? state.timers[process.name].lapTime : '00:00:00'}
          </div>
        </td>
        <td>
          <div class="controls">
            <button class="${process.timerRunning ? 'btn-danger' : 'btn-success'}" onclick="toggleTimer(${processIndex})">
              ${process.timerRunning ? 'Stop' : 'Start'}
            </button>
            <button class="btn-secondary" onclick="resetTimer(${processIndex})">Reset</button>
          </div>
        </td>
        <td colspan="2">
          <div class="subprocess-input">
            <input type="text" id="subprocess-input-${processIndex}" placeholder="Enter subprocess name">
            <button class="btn-primary" onclick="addSubprocess(${processIndex})">Add</button>
          </div>
        </td>
      `;
      
      processTableBody.appendChild(processRow);
      
      // Find the last uncompleted subprocess (the one that should be active)
      let activeSubprocessIndex = -1;
      for (let i = process.subprocesses.length - 1; i >= 0; i--) {
        if (!process.subprocesses[i].completed) {
          activeSubprocessIndex = i;
          break;
        }
      }
      
      // If no uncompleted subprocess was found, set the last one as active
      if (activeSubprocessIndex === -1 && process.subprocesses.length > 0) {
        activeSubprocessIndex = process.subprocesses.length - 1;
      }
      
      // Subprocess Rows
      process.subprocesses.forEach((subprocess, subprocessIndex) => {
        const subprocessRow = document.createElement('tr');
        subprocessRow.className = 'subprocess-row';
        
        if (state.activeProcess === processIndex && state.activeSubprocess === subprocessIndex) {
          subprocessRow.className += ' active-subprocess';
        }
        
        // Enable the lap button for the active subprocess
        // Disable lap buttons for subprocesses that come before the active one
        const isActive = (subprocessIndex === activeSubprocessIndex);
        const isButtonEnabled = process.timerRunning && isActive;
        
        subprocessRow.innerHTML = `
          <td>
            <div class="delete-buttons">
              <button class="btn-danger btn-small" onclick="deleteLastReading(${processIndex}, ${subprocessIndex})">Delete Last</button>
              <button class="btn-danger btn-small" onclick="deleteSubprocessReadings(${processIndex}, ${subprocessIndex})">Delete All</button>
            </div>
          </td>
          <td></td>
          <td></td>
          <td>
            <div class="subprocess-details">
              <div class="subprocess-name-container">
                <div class="subprocess-name">${subprocess.name}</div>
                ${subprocess.formattedTime !== '00:00:00' ? 
                  `<span class="subprocess-time">${subprocess.formattedTime}</span>` : ''}
              </div>
              
              <div class="subprocess-inputs">
                <div class="input-group">
                  <label for="activity-type-${processIndex}-${subprocessIndex}">Activity Type:</label>
                  <select id="activity-type-${processIndex}-${subprocessIndex}" class="activity-type-select">
                    <option value="" ${subprocess.activityType === '' ? 'selected' : ''}>Select</option>
                    <option value="VA" ${subprocess.activityType === 'VA' ? 'selected' : ''}>VA</option>
                    <option value="NVA" ${subprocess.activityType === 'NVA' ? 'selected' : ''}>NVA</option>
                    <option value="NVA" ${subprocess.activityType === 'RNVA' ? 'selected' : ''}>RNVA</option>
                  </select>
                </div>
                
                <div class="input-group">
                  <label for="remarks-${processIndex}-${subprocessIndex}">Remarks:</label>
                  <input type="text" id="remarks-${processIndex}-${subprocessIndex}" class="remarks-input" 
                    value="${subprocess.remarks || ''}" placeholder="Add remarks">
                </div>
                
                <div class="input-group">
                  <label for="person-count-${processIndex}-${subprocessIndex}">Persons:</label>
                  <input type="number" id="person-count-${processIndex}-${subprocessIndex}" class="person-count-input" 
                    value="${subprocess.personCount || 1}" min="1" max="100">
                </div>
              </div>
            </div>
          </td>
          <td>
            <div class="controls">
              <button class="${isButtonEnabled ? 'btn-primary' : 'btn-secondary'}" 
                ${!isButtonEnabled ? 'disabled' : ''}
                onclick="recordLap(${processIndex}, ${subprocessIndex})">
                Lap
              </button>
            </div>
          </td>
        `;
        
        processTableBody.appendChild(subprocessRow);
      });
    });
  }
  
  // Render the recorded times table for desktop view
  function renderRecordedTimes() {
    recordedTimesTableBody.innerHTML = '';
    let hasReadings = false;
    
    state.processes.forEach((process, processIndex) => {
      if (process.readings && process.readings.length > 0) {
        hasReadings = true;
        
        process.readings.forEach((reading, idx) => {
          const row = document.createElement('tr');
          
          row.innerHTML = `
            <td>${process.name}</td>
            <td>${reading.subprocess}</td>
            <td>${reading.formattedTime}</td>
            <td>${reading.activityType || ""}</td>
            <td>${reading.personCount || 1}</td>
            <td>${reading.remarks || ""}</td>
            <td>${reading.formattedStartTime || ""}</td>
            <td>${reading.formattedEndTime || ""}</td>
            <td>
              ${new Date(reading.timestamp).toLocaleString()}
              <button class="btn-danger btn-small" onclick="deleteReading(${processIndex}, ${idx})">
                Delete
              </button>
            </td>
          `;
          
          recordedTimesTableBody.appendChild(row);
        });
      }
    });
    
    recordedTimesContainer.style.display = hasReadings ? 'block' : 'none';
  }
  
  // Show notification
  function showNotification(message, duration = 2000) {
    // Get or create notification element
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
      notification.style.display = 'none';
    }, duration);
  }
  
  // Mobile view functions
  // Render mobile card-based view
  function renderMobileView() {
    const mobileView = document.getElementById('mobileView');
    if (!mobileView) {
      console.error("Mobile view container not found!");
      return;
    }
    
    mobileView.innerHTML = '';
    
    // Processes section header - more compact
    const processesHeader = document.createElement('div');
    processesHeader.className = 'section-header';
    processesHeader.style.padding = '6px 10px';
    processesHeader.style.marginBottom = '8px';
    processesHeader.innerHTML = '<h2>Processes</h2>';
    mobileView.appendChild(processesHeader);
    
    // Render each process as a card in reverse order (most recent at the top)
    const processesReversed = [...state.processes].reverse();
    
    processesReversed.forEach((process, reversedIndex) => {
      // Calculate the original index for the function calls
      const originalProcessIndex = state.processes.length - 1 - reversedIndex;
      const card = createProcessCard(process, originalProcessIndex);
      mobileView.appendChild(card);
    });
    
    // Add new process button - more compact
    const addButton = document.createElement('button');
    addButton.className = 'add-process-button';
    addButton.textContent = '+ Add New Process';
    addButton.style.height = '36px';
    addButton.style.margin = '5px 0';
    addButton.onclick = () => showAddProcessModal();
    mobileView.appendChild(addButton);
    
    // If there are recorded times, show a section for them
    if (hasRecordedTimes()) {
      const timesHeader = document.createElement('div');
      timesHeader.className = 'section-header';
      timesHeader.style.marginTop = '10px';
      timesHeader.style.padding = '6px 10px';
      timesHeader.innerHTML = '<h2>Recorded Times</h2>';
      mobileView.appendChild(timesHeader);
      
      const recordedTimesCard = createRecordedTimesCard();
      mobileView.appendChild(recordedTimesCard);
    }
  }
  
  // Create a card for a process
  // Create a card for a process
// Create a card for a process
// Create a card for a process
// Create a card for a process
function createProcessCard(process, processIndex) {
    const card = document.createElement('div');
    card.className = 'process-card';
    card.style.marginBottom = '10px';
    card.style.position = 'relative'; // For positioning the sticky timer
    
    // Process header with name and timer
    const header = document.createElement('div');
    header.className = 'process-header';
    header.style.padding = '8px 10px';
    header.innerHTML = `
      <div class="process-name" style="font-size: 15px;">${process.name}</div>
      <div class="process-timer" id="mobile-timer-${process.name}" style="font-size: 16px;">
        ${process.timerRunning && state.timers[process.name] ? state.timers[process.name].lapTime : '00:00:00'}
      </div>
    `;
    card.appendChild(header);
    
    // Process controls
    const controls = document.createElement('div');
    controls.className = 'process-controls';
    controls.style.padding = '5px';
    controls.style.gap = '5px';
    controls.innerHTML = `
      <button class="${process.timerRunning ? 'btn-danger' : 'btn-success'}" 
        onclick="toggleTimer(${processIndex})" style="height: 34px;">
        ${process.timerRunning ? 'Stop' : 'Start'}
      </button>
      <button class="btn-secondary" onclick="resetTimer(${processIndex})" style="height: 34px;">Reset</button>
      <button class="btn-primary" onclick="showAddSubprocessModal(${processIndex})" style="height: 34px;">+ Subprocess</button>
    `;
    card.appendChild(controls);
    
    // Process actions
    const actions = document.createElement('div');
    actions.className = 'process-actions';
    actions.style.padding = '0 5px 5px';
    actions.style.gap = '5px';
    actions.innerHTML = `
      <button class="btn-secondary" onclick="showEditProcessModal(${processIndex})" style="height: 34px;">Edit</button>
      <button class="btn-danger" onclick="deleteProcess(${processIndex})" style="height: 34px;">Delete</button>
    `;
    card.appendChild(actions);
    
    // Create a subprocess container that will hold all subprocesses
    const subprocessContainer = document.createElement('div');
    subprocessContainer.className = 'subprocess-container';
    card.appendChild(subprocessContainer);
    
    // Render subprocesses in reverse order (most recent at the top)
    const subprocessesReversed = [...process.subprocesses].reverse();
    
    // Create a sticky timer/control bar if timer is running and there are subprocesses
    if (process.timerRunning && process.subprocesses.length > 0) {
      // Find the active subprocess
      let activeSubprocessIndex = -1;
      for (let i = process.subprocesses.length - 1; i >= 0; i--) {
        if (!process.subprocesses[i].completed) {
          activeSubprocessIndex = i;
          break;
        }
      }
      
      if (activeSubprocessIndex === -1 && process.subprocesses.length > 0) {
        activeSubprocessIndex = process.subprocesses.length - 1;
      }
      
      // Find the reversed index that corresponds to the active subprocess
      const reversedActiveIndex = process.subprocesses.length - 1 - activeSubprocessIndex;
      const activeSubprocess = process.subprocesses[activeSubprocessIndex];
      
      // Create sticky timer bar
      const stickyBar = document.createElement('div');
      stickyBar.style.position = 'sticky';
      stickyBar.style.top = '0';
      stickyBar.style.backgroundColor = '#ffffff';
      stickyBar.style.padding = '5px';
      stickyBar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      stickyBar.style.zIndex = '5';
      stickyBar.style.display = 'flex';
      stickyBar.style.alignItems = 'center';
      stickyBar.style.justifyContent = 'space-between';
      stickyBar.style.borderRadius = '8px';
      stickyBar.style.marginBottom = '5px';
      
      stickyBar.innerHTML = `
        <div style="display: flex; flex-direction: column;">
          <div style="font-weight: bold; font-size: 14px;">${activeSubprocess.name}</div>
          <div class="process-timer" style="font-family: monospace; font-size: 16px; color: #10b981;">
            ${process.timerRunning && state.timers[process.name] ? state.timers[process.name].lapTime : '00:00:00'}
          </div>
        </div>
        <button 
          class="btn-primary" 
          onclick="recordLap(${processIndex}, ${activeSubprocessIndex})" 
          style="height: 34px; padding: 0 15px;"
        >
          Lap
        </button>
      `;
      
      subprocessContainer.appendChild(stickyBar);
    }
    
    // Add each subprocess card to the container
    subprocessesReversed.forEach((subprocess, reversedIndex) => {
      // Calculate the original index for the function calls
      const originalSubprocessIndex = process.subprocesses.length - 1 - reversedIndex;
      subprocessContainer.appendChild(createSubprocessCard(process, processIndex, subprocess, originalSubprocessIndex));
    });
    
    return card;
  }
  
  // Create a card for a subprocess
  function createSubprocessCard(process, processIndex, subprocess, subprocessIndex) {
    const card = document.createElement('div');
    card.className = 'subprocess-card';
    card.style.margin = '4px 8px';
    card.style.padding = '8px';
    
    // Find if this is the active subprocess
    let activeSubprocessIndex = -1;
    for (let i = process.subprocesses.length - 1; i >= 0; i--) {
      if (!process.subprocesses[i].completed) {
        activeSubprocessIndex = i;
        break;
      }
    }
    
    if (activeSubprocessIndex === -1 && process.subprocesses.length > 0) {
      activeSubprocessIndex = process.subprocesses.length - 1;
    }
    
    const isActive = (subprocessIndex === activeSubprocessIndex);
    const isButtonEnabled = process.timerRunning && isActive;
    
    // If this is the active subprocess, add a visual indicator
    if (isActive) {
      card.style.borderLeft = '4px solid #10b981';
    }
    
    // Subprocess header and time (more compact)
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '8px';
    headerRow.innerHTML = `
      <div style="font-weight: bold; font-size: 14px;">${subprocess.name}</div>
      ${subprocess.formattedTime !== '00:00:00' ? 
        `<span style="color: #10b981; font-weight: bold; font-size: 14px;">${subprocess.formattedTime}</span>` : ''}
    `;
    card.appendChild(headerRow);
    
    // Form inputs in two columns for better space usage
    const form = document.createElement('div');
    form.className = 'subprocess-inputs';
    form.style.marginBottom = '5px';
    
    // Create a 2-column layout for inputs
    const inputRow = document.createElement('div');
    inputRow.style.display = 'flex';
    inputRow.style.gap = '5px';
    inputRow.style.marginBottom = '5px';
    
    // Column 1: Activity Type
    const column1 = document.createElement('div');
    column1.style.flex = '1';
    column1.innerHTML = `
      <label for="activity-type-${processIndex}-${subprocessIndex}" style="display: block; font-size: 12px; margin-bottom: 2px;">Activity Type</label>
      <select id="activity-type-${processIndex}-${subprocessIndex}" class="activity-type-select" style="width: 100%; height: 32px; padding: 2px 5px; font-size: 13px;">
        <option value="" ${subprocess.activityType === '' ? 'selected' : ''}>Select</option>
        <option value="VA" ${subprocess.activityType === 'VA' ? 'selected' : ''}>VA</option>
        <option value="NVA" ${subprocess.activityType === 'NVA' ? 'selected' : ''}>NVA</option>
        <option value="RNVA" ${subprocess.activityType === 'RNVA' ? 'selected' : ''}>RNVA</option>
      </select>
    `;
    
    // Column 2: Persons
    const column2 = document.createElement('div');
    column2.style.flex = '1';
    column2.innerHTML = `
      <label for="person-count-${processIndex}-${subprocessIndex}" style="display: block; font-size: 12px; margin-bottom: 2px;">Persons</label>
      <input type="number" id="person-count-${processIndex}-${subprocessIndex}" class="person-count-input" 
        value="${subprocess.personCount || 1}" min="1" max="100" style="width: 100%; height: 32px; padding: 2px 5px; font-size: 13px;">
    `;
    
    inputRow.appendChild(column1);
    inputRow.appendChild(column2);
    form.appendChild(inputRow);
    
    // Remarks field
    const remarksField = document.createElement('div');
    remarksField.innerHTML = `
      <label for="remarks-${processIndex}-${subprocessIndex}" style="display: block; font-size: 12px; margin-bottom: 2px;">Remarks</label>
      <input type="text" id="remarks-${processIndex}-${subprocessIndex}" class="remarks-input" 
        value="${subprocess.remarks || ''}" placeholder="Add remarks" style="width: 100%; height: 32px; padding: 2px 5px; font-size: 13px;">
    `;
    form.appendChild(remarksField);
    card.appendChild(form);
    
    // Action buttons row
    const actionRow = document.createElement('div');
    actionRow.style.display = 'flex';
    actionRow.style.gap = '4px';
    actionRow.style.marginTop = '5px';
    
    // Delete buttons
    const deleteButtons = document.createElement('div');
    deleteButtons.style.display = 'flex';
    deleteButtons.style.gap = '4px';
    deleteButtons.style.flex = '2';
    deleteButtons.innerHTML = `
      <button class="btn-danger" onclick="deleteLastReading(${processIndex}, ${subprocessIndex})" style="flex: 1; height: 32px; font-size: 11px; padding: 0 3px;">Delete Last</button>
      <button class="btn-danger" onclick="deleteSubprocessReadings(${processIndex}, ${subprocessIndex})" style="flex: 1; height: 32px; font-size: 11px; padding: 0 3px;">Delete All</button>
    `;
    actionRow.appendChild(deleteButtons);
    
    // Only show lap button if not in sticky header or if sticky header is not showing
    if (!process.timerRunning || !isActive) {
      // Lap button
      const lapButton = document.createElement('button');
      lapButton.className = isButtonEnabled ? 'btn-primary' : 'btn-secondary';
      lapButton.textContent = 'Lap';
      lapButton.style.flex = '1';
      lapButton.style.height = '32px';
      lapButton.style.fontSize = '13px';
      lapButton.disabled = !isButtonEnabled;
      lapButton.onclick = () => recordLap(processIndex, subprocessIndex);
      actionRow.appendChild(lapButton);
    }
    
    card.appendChild(actionRow);
    
    return card;
  }
  
  
  // Create a card for a subprocess
  function createSubprocessCard(process, processIndex, subprocess, subprocessIndex) {
    const card = document.createElement('div');
    card.className = 'subprocess-card';
    
    // Find if this is the active subprocess
    let activeSubprocessIndex = -1;
    for (let i = process.subprocesses.length - 1; i >= 0; i--) {
      if (!process.subprocesses[i].completed) {
        activeSubprocessIndex = i;
        break;
      }
    }
    
    if (activeSubprocessIndex === -1 && process.subprocesses.length > 0) {
      activeSubprocessIndex = process.subprocesses.length - 1;
    }
    
    const isActive = (subprocessIndex === activeSubprocessIndex);
    const isButtonEnabled = process.timerRunning && isActive;
    
    // Subprocess header
    const header = document.createElement('div');
    header.className = 'subprocess-header';
    header.innerHTML = `
      ${subprocess.name}
      ${subprocess.formattedTime !== '00:00:00' ? 
        `<span style="float: right; color: #10b981;">${subprocess.formattedTime}</span>` : ''}
    `;
    card.appendChild(header);
    
    // Form inputs
    const form = document.createElement('div');
    form.className = 'subprocess-inputs';
    form.innerHTML = `
      <div class="input-group">
        <label for="activity-type-${processIndex}-${subprocessIndex}">Activity Type</label>
        <select id="activity-type-${processIndex}-${subprocessIndex}" class="activity-type-select">
        <option value="" ${subprocess.activityType === '' ? 'selected' : ''}>Select</option>
        <option value="VA" ${subprocess.activityType === 'VA' ? 'selected' : ''}>VA</option>
        <option value="NVA" ${subprocess.activityType === 'NVA' ? 'selected' : ''}>NVA</option>
        <option value="RNVA" ${subprocess.activityType === 'RNVA' ? 'selected' : ''}>RNVA</option>
      </select>
    </div>
    
    <div class="input-group">
      <label for="person-count-${processIndex}-${subprocessIndex}">Persons</label>
      <input type="number" id="person-count-${processIndex}-${subprocessIndex}" class="person-count-input" 
        value="${subprocess.personCount || 1}" min="1" max="100">
    </div>
    
    <div class="input-group">
      <label for="remarks-${processIndex}-${subprocessIndex}">Remarks</label>
      <input type="text" id="remarks-${processIndex}-${subprocessIndex}" class="remarks-input" 
        value="${subprocess.remarks || ''}" placeholder="Add remarks">
    </div>
  `;
  card.appendChild(form);
  
  // Subprocess actions
  const actions = document.createElement('div');
  actions.className = 'subprocess-actions';
  
  // Delete buttons
  const deleteButtons = document.createElement('div');
  deleteButtons.className = 'delete-buttons';
  deleteButtons.innerHTML = `
    <button class="btn-danger" onclick="deleteLastReading(${processIndex}, ${subprocessIndex})">Delete Last</button>
    <button class="btn-danger" onclick="deleteSubprocessReadings(${processIndex}, ${subprocessIndex})">Delete All</button>
  `;
  actions.appendChild(deleteButtons);
  
  // Lap button
  const lapButton = document.createElement('button');
  lapButton.className = isButtonEnabled ? 'btn-primary' : 'btn-secondary';
  lapButton.textContent = 'Lap';
  lapButton.disabled = !isButtonEnabled;
  lapButton.onclick = () => recordLap(processIndex, subprocessIndex);
  actions.appendChild(lapButton);
  
  card.appendChild(actions);
  
  return card;
}

// Create a card for recorded times
// Create a card for recorded times
function createRecordedTimesCard() {
    const card = document.createElement('div');
    card.className = 'recorded-times-card';
    
    let html = '';
    
    // Get all readings from all processes and sort by timestamp (newest first)
    const allReadings = [];
    
    state.processes.forEach((process, processIndex) => {
      if (process.readings && process.readings.length > 0) {
        process.readings.forEach((reading, idx) => {
          allReadings.push({...reading, processIndex, readingIndex: idx});
        });
      }
    });
    
    // Sort by timestamp, newest first
    allReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    allReadings.forEach(reading => {
      html += `
        <div style="background: white; margin-bottom: 8px; padding: 8px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <strong style="font-size: 14px;">${reading.process} - ${reading.subprocess}</strong>
            <span style="color: #10b981; font-weight: bold; font-size: 14px;">${reading.formattedTime}</span>
          </div>
          <div style="font-size: 13px;">
            <div><strong>Activity:</strong> ${reading.activityType || "—"} | <strong>Persons:</strong> ${reading.personCount}</div>
            <div><strong>Remarks:</strong> ${reading.remarks || "—"}</div>
            <div style="color: #666; font-size: 12px; margin-top: 3px;">${new Date(reading.timestamp).toLocaleString()}</div>
          </div>
          <div style="text-align: right; margin-top: 3px;">
            <button class="btn-danger btn-small" onclick="deleteReading(${reading.processIndex}, ${reading.readingIndex})" 
              style="height: 30px; font-size: 12px; padding: 0 8px;">
              Delete
            </button>
          </div>
        </div>
      `;
    });
    
    if (html === '') {
      html = '<div style="text-align: center; padding: 15px;">No recorded times yet</div>';
    }
    
    card.innerHTML = html;
    return card;
  }


// Check if there are any recorded times
function hasRecordedTimes() {
  return state.processes.some(process => 
    process.readings && process.readings.length > 0
  );
}

// Show add process modal
function showAddProcessModal() {
  showModal('Add Process', `
    <div>
      <input type="text" id="mobile-process-name" placeholder="Enter process name" style="width: 100%; padding: 10px; margin-bottom: 15px;">
      <button onclick="addProcessFromModal()" class="btn-primary" style="width: 100%;">Add Process</button>
    </div>
  `);
  
  // Focus the input field
  setTimeout(() => {
    const input = document.getElementById('mobile-process-name');
    if (input) input.focus();
  }, 100);
}

// Show add subprocess modal
function showAddSubprocessModal(processIndex) {
  showModal('Add Subprocess', `
    <div>
      <input type="text" id="mobile-subprocess-name" placeholder="Enter subprocess name" style="width: 100%; padding: 10px; margin-bottom: 15px;">
      <button onclick="addSubprocessFromModal(${processIndex})" class="btn-primary" style="width: 100%;">Add Subprocess</button>
    </div>
  `);
  
  // Focus the input field
  setTimeout(() => {
    const input = document.getElementById('mobile-subprocess-name');
    if (input) input.focus();
  }, 100);
}

// Show edit process modal
function showEditProcessModal(processIndex) {
  const process = state.processes[processIndex];
  
  showModal('Edit Process', `
    <div>
      <input type="text" id="mobile-edit-process-name" value="${process.name}" placeholder="Enter process name" style="width: 100%; padding: 10px; margin-bottom: 15px;">
      <button onclick="updateProcessFromModal(${processIndex})" class="btn-success" style="width: 100%;">Update Process</button>
    </div>
  `);
  
  // Focus the input field
  setTimeout(() => {
    const input = document.getElementById('mobile-edit-process-name');
    if (input) input.focus();
  }, 100);
}

// Add process from modal
function addProcessFromModal() {
  const input = document.getElementById('mobile-process-name');
  if (!input) return;
  
  const processName = input.value.trim();
  if (!processName) return;
  
  const newProcess = {
    name: processName,
    subprocesses: [],
    active: false,
    timerRunning: false,
    elapsedTime: 0,
    startTime: null,
    lastLapTime: 0,
    readings: []
  };
  
  state.processes.push(newProcess);
  
  closeModal();
  renderInterface();
  
  // Save to localStorage
  saveToLocalStorage();
}

// Add subprocess from modal
function addSubprocessFromModal(processIndex) {
  const input = document.getElementById('mobile-subprocess-name');
  if (!input) return;
  
  const subprocessName = input.value.trim();
  if (!subprocessName) return;
  
  const process = state.processes[processIndex];
  
  // Mark the current active subprocess as completed when adding a new one
  if (process.subprocesses.length > 0) {
    const lastSubprocess = process.subprocesses[process.subprocesses.length - 1];
    lastSubprocess.completed = true;
  }
  
  // Add the new subprocess
  process.subprocesses.push({
    name: subprocessName,
    time: 0,
    formattedTime: '00:00:00',
    completed: false,
    activityType: '', // VA or NVA
    remarks: '',      // Remarks
    personCount: 1    // Default number of persons required
  });
  
  closeModal();
  renderInterface();
  
  // Save to localStorage
  saveToLocalStorage();
}

// Update process from modal
function updateProcessFromModal(processIndex) {
  const input = document.getElementById('mobile-edit-process-name');
  if (!input) return;
  
  const processName = input.value.trim();
  if (!processName) return;
  
  state.processes[processIndex].name = processName;
  
  closeModal();
  renderInterface();
  
  // Save to localStorage
  saveToLocalStorage();
}

// Update mobile timer displays
function updateMobileTimerDisplays() {
    state.processes.forEach(process => {
      // Update the main process timer
      const timerDisplay = document.getElementById(`mobile-timer-${process.name}`);
      if (timerDisplay && state.timers[process.name]) {
        timerDisplay.textContent = state.timers[process.name].lapTime;
      }
      
      // Find all timer displays (including sticky ones) and update them
      const timerDisplays = document.querySelectorAll(`.process-timer[id="mobile-timer-${process.name}"], .process-timer:not([id])`);
      timerDisplays.forEach(display => {
        if (state.timers[process.name]) {
          display.textContent = state.timers[process.name].lapTime;
        }
      });
    });
  }
  function setupMobileActionBar() {
    const mobileActionBar = document.getElementById('mobileActionBar');
    if (mobileActionBar) {
      mobileActionBar.style.padding = '4px';
      mobileActionBar.style.gap = '4px';
      
      const mobileAddProcessBtn = document.getElementById('mobileAddProcessBtn');
      if (mobileAddProcessBtn) {
        mobileAddProcessBtn.style.height = '32px';
        mobileAddProcessBtn.style.fontSize = '13px';
      }
      
      const mobileExportBtn = document.getElementById('mobileExportBtn');
      if (mobileExportBtn) {
        mobileExportBtn.style.height = '32px';
        mobileExportBtn.style.fontSize = '13px';
      }
    }
  }
// Show modal
function showModal(title, content) {
  // Create or get modal
  let modal = document.getElementById('modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" onclick="closeModal()">&times;</span>
      <h3>${title}</h3>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

// Close modal
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  // Check for saved data in localStorage
  const savedData = localStorage.getItem('timeMotionData');
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      state.processes = parsedData.processes || [];
      
      if (state.processes.length > 0) {
        renderInterface();
        if (!isMobile) {
          processTableContainer.style.display = 'block';
        }
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
    }
  }
  setupMobileActionBar();
  
  // Setup event listeners
  if (addProcessBtn) {
    addProcessBtn.addEventListener('click', addProcess);
  }
  
  if (updateProcessBtn) {
    updateProcessBtn.addEventListener('click', saveEditProcess);
  }
  
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', cancelEdit);
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToExcel);
  }
  
  // Mobile-specific initialization
  const mobileAddProcessBtn = document.getElementById('mobileAddProcessBtn');
  if (mobileAddProcessBtn) {
    mobileAddProcessBtn.addEventListener('click', showAddProcessModal);
  }
  
  const mobileExportBtn = document.getElementById('mobileExportBtn');
  if (mobileExportBtn) {
    mobileExportBtn.addEventListener('click', exportToExcel);
  }
  
  // Initial render
  renderInterface();
  
  // Save data periodically
  setInterval(function() {
    saveToLocalStorage();
  }, 10000); // Save every 10 seconds
});
