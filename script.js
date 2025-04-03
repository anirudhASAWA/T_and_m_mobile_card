// Main application state
function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
  
  // Replace the existing resize event listener with this debounced version
  window.addEventListener('resize', debounce(function() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    // If changed between mobile and desktop, save form data first
    if (wasMobile !== isMobile) {
      // Save all form data before switching views
      captureAllFormData();
      // Then render the new interface
      renderInterface();
    }
  }, 250)); // 250ms debounce time
  
  // Add this function to capture all form data before view changes
  function captureAllFormData() {
    // Loop through all processes and subprocesses to capture form data
    state.processes.forEach((process, processIndex) => {
      // First handle subprocess data
      if (process.subprocesses && process.subprocesses.length > 0) {
        process.subprocesses.forEach((subprocess, subprocessIndex) => {
          // Get references to the form elements that might exist in either view
          let activityTypeElement, remarksElement, personCountElement, productionQtyElement, ratingElement;
          
          // Try to find the elements in current view (mobile or desktop)
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
          productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
          ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
          
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
          if (productionQtyElement) {
            subprocess.productionQty = parseInt(productionQtyElement.value) || 0;
          }
          if (ratingElement) {
            subprocess.rating = parseInt(ratingElement.value) || 100;
          }
        });
      }
    });
    
    // Save the current state to localStorage
    saveToLocalStorage();
    
    console.log("All form data captured before view transition");
  }
  
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
    
    // Ensure timer displays are updated correctly
    updateAllTimerDisplays();
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
    
    // Add the new subprocess with production quantity field
    process.subprocesses.push({
      name: subprocessName,
      time: 0,
      formattedTime: '00:00:00',
      completed: false,
      activityType: '',   // VA or NVA
      remarks: '',        // Remarks
      personCount: 1,     // Default number of persons required
      productionQty: 0    // NEW: Production quantity field
    });
    
    subprocessInput.value = '';
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
  }
  
  // Delete all readings of a specific subprocess
  // Delete a subprocess and all its readings
  function deleteSubprocessReadings(processIndex, subprocessIndex) {
    const process = state.processes[processIndex];
    const subprocess = process.subprocesses[subprocessIndex];
    const subprocessName = subprocess.name;
    
    // Remove all readings related to this subprocess
    if (process.readings && process.readings.length > 0) {
      process.readings = process.readings.filter(reading => reading.subprocess !== subprocessName);
    }
    
    // Delete the subprocess itself from the process
    process.subprocesses.splice(subprocessIndex, 1);
    
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
        let activityTypeElement, remarksElement, personCountElement, productionQtyElement, ratingElement;
        
        if (isMobile) {
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
          productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
          ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
        } else {
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
          productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
          ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
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
        if (productionQtyElement) {
          subprocess.productionQty = parseInt(productionQtyElement.value) || 0;
        }
        if (ratingElement) {
          subprocess.rating = parseInt(ratingElement.value) || 100;
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
    
    // Save to localStorage before re-rendering
    saveToLocalStorage();
    
    // Re-render the interface AFTER saving all data
    renderInterface();
    
    // Restore the form values after rendering
    restoreFormValues(processIndex);
  }
  
  // Update the timer display for a process
  function updateTimerDisplay(processName) {
    const timerDisplay = document.getElementById(`timer-${processName}`);
    if (timerDisplay && state.timers[processName]) {
      // Only show the time since the last lap (time difference)
      timerDisplay.textContent = state.timers[processName].lapTime;
    }
  }
  

  function updateAllTimerDisplays() {
    state.processes.forEach(process => {
      if (process.timerRunning && state.timers[process.name]) {
        // Update desktop timer display
        const desktopTimer = document.getElementById(`timer-${process.name}`);
        if (desktopTimer) {
          desktopTimer.textContent = state.timers[process.name].lapTime;
        }
        
        // Update mobile timer display
        const mobileTimer = document.getElementById(`mobile-timer-${process.name}`);
        if (mobileTimer) {
          mobileTimer.textContent = state.timers[process.name].lapTime;
        }
      }
    });
  }


  function restoreFormValues(processIndex) {
    const process = state.processes[processIndex];
    
    if (process.subprocesses && process.subprocesses.length > 0) {
      process.subprocesses.forEach((subprocess, subprocessIndex) => {
        // Get references to the input elements after rendering
        let activityTypeElement, remarksElement, personCountElement, productionQtyElement, ratingElement;
        
        if (isMobile) {
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
          productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
          ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
        } else {
          activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
          remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
          personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
          productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
          ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
        }
        
        // Restore the values from state
        if (activityTypeElement) {
          activityTypeElement.value = subprocess.activityType || '';
        }
        if (remarksElement) {
          remarksElement.value = subprocess.remarks || '';
        }
        if (personCountElement) {
          personCountElement.value = subprocess.personCount || 1;
        }
        if (productionQtyElement) {
          productionQtyElement.value = subprocess.productionQty || 0;
        }
        if (ratingElement) {
          ratingElement.value = subprocess.rating || 100;
        }
      });
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
    let activityTypeElement, remarksElement, personCountElement, productionQtyElement, ratingElement;
    
    if (isMobile) {
      activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
      remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
      personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
      productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
      ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
    } else {
      activityTypeElement = document.getElementById(`activity-type-${processIndex}-${subprocessIndex}`);
      remarksElement = document.getElementById(`remarks-${processIndex}-${subprocessIndex}`);
      personCountElement = document.getElementById(`person-count-${processIndex}-${subprocessIndex}`);
      productionQtyElement = document.getElementById(`production-qty-${processIndex}-${subprocessIndex}`);
      ratingElement = document.getElementById(`rating-${processIndex}-${subprocessIndex}`);
    }
    
    if (!activityTypeElement || !remarksElement || !personCountElement || !productionQtyElement || !ratingElement) {
      console.error("Could not find form elements for subprocess", processIndex, subprocessIndex);
      return;
    }
    
    const activityType = activityTypeElement.value;
    const remarks = remarksElement.value;
    const personCount = parseInt(personCountElement.value) || 1;
    const productionQty = parseInt(productionQtyElement.value) || 0;
    const rating = parseInt(ratingElement.value) || 100;
    
    // Save the additional data to the subprocess
    subprocess.activityType = activityType;
    subprocess.remarks = remarks;
    subprocess.personCount = personCount;
    subprocess.productionQty = productionQty;
    subprocess.rating = rating;  // Store rating at subprocess level
    
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
      productionQty: productionQty,
      // We don't need to store rating at reading level anymore as we'll use subprocess.rating
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
  // Export data directly to Excel using SheetJS including production quantity
  function exportToExcel() {
    // Check if we have data to export
    let hasData = false;
    state.processes.forEach(process => {
      if (process.readings && process.readings.length > 0) {
        hasData = true;
      }
    });
    
    if (!hasData) {
      alert('No data to export!');
      return;
    }
    
    // Ensure XLSX library is available - attempt to load it in multiple ways
    const ensureXLSX = async function() {
      // If XLSX is already available, use it
      if (typeof XLSX !== 'undefined') {
        return Promise.resolve();
      }
      
      console.log('XLSX not available, attempting to load it...');
      
      // Try multiple CDN sources to improve reliability
      const cdnSources = [
        'https://unpkg.com/xlsx/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
      ];
      
      // Helper function to load script from URL
      const loadScript = function(url) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.async = true;
          
          script.onload = () => {
            console.log(`Successfully loaded XLSX from ${url}`);
            resolve();
          };
          
          script.onerror = () => {
            console.error(`Failed to load XLSX from ${url}`);
            reject(new Error(`Failed to load XLSX from ${url}`));
          };
          
          document.head.appendChild(script);
        });
      };
      
      // Try each source until one works
      for (const source of cdnSources) {
        try {
          await loadScript(source);
          // If we get here, loading succeeded
          if (typeof XLSX !== 'undefined') {
            console.log('XLSX library successfully loaded and ready');
            return;
          }
        } catch (e) {
          console.warn(`Source ${source} failed, trying next source...`);
        }
      }
      
      // If we reached here, all sources failed
      throw new Error('Could not load XLSX library from any source');
    };
    
    // Main export process wrapped in async function
    const startExport = async function() {
      try {
        // Ensure XLSX is available
        await ensureXLSX();
        
        // Always show the filename dialog for both mobile and desktop
        showModal('Export to Excel', `
          <div>
            <label for="export-filename" style="display: block; margin-bottom: 8px;">Enter filename (without extension):</label>
            <input type="text" id="export-filename" value="time_motion_study" style="width: 100%; padding: 10px; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
              <button onclick="confirmExport()" class="btn-success" style="flex: 1;">Export</button>
              <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">Cancel</button>
            </div>
          </div>
        `);
        
        // Focus the input field for better user experience
        setTimeout(() => {
          const input = document.getElementById('export-filename');
          if (input) {
            input.focus();
            input.select(); // Select the text for easy editing
          }
        }, 100);
        
      } catch (error) {
        console.error('Error preparing for export:', error);
        alert('There was an error preparing for export: ' + error.message);
        
        // Offer CSV fallback
        if (confirm('Would you like to try exporting as CSV instead?')) {
          // For CSV export, also ask for filename
          showModal('Export to CSV', `
            <div>
              <label for="export-filename" style="display: block; margin-bottom: 8px;">Enter filename (without extension):</label>
              <input type="text" id="export-filename" value="time_motion_study" style="width: 100%; padding: 10px; margin-bottom: 15px;">
              <div style="display: flex; gap: 10px;">
                <button onclick="confirmCSVExport()" class="btn-success" style="flex: 1;">Export as CSV</button>
                <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">Cancel</button>
              </div>
            </div>
          `);
          
          // Focus the input field
          setTimeout(() => {
            const input = document.getElementById('export-filename');
            if (input) {
              input.focus();
              input.select();
            }
          }, 100);
        }
      }
    };
    
    // Start the export process
    startExport();
  }
  
    
  function confirmExport() {
    const filenameInput = document.getElementById('export-filename');
    let filename = 'time_motion_study';
    
    if (filenameInput && filenameInput.value.trim()) {
      filename = filenameInput.value.trim();
    }
    
    closeModal();
    proceedWithExport(filename);
  }
  
  function confirmCSVExport() {
    const filenameInput = document.getElementById('export-filename');
    let filename = 'time_motion_study';
    
    if (filenameInput && filenameInput.value.trim()) {
      filename = filenameInput.value.trim();
    }
    
    closeModal();
    exportToCSV(filename);
  }
  function calculateFrequencies(processes) {
    const allFrequencies = {};
    
    processes.forEach(process => {
      if (!process.readings || process.readings.length === 0) {
        allFrequencies[process.name] = {};
        return;
      }
      
      allFrequencies[process.name] = {};
      const subprocessCounts = {};
      const subprocessNames = new Set();
      
      process.subprocesses.forEach(subprocess => {
        subprocessNames.add(subprocess.name);
      });
      
      process.readings.forEach(reading => {
        if (reading.process === process.name) {
          subprocessNames.add(reading.subprocess);
        }
      });
      
      Array.from(subprocessNames).forEach(subprocessName => {
        const readings = process.readings.filter(r => 
          r.process === process.name && r.subprocess === subprocessName
        );
        subprocessCounts[subprocessName] = readings.length;
      });
      
      const cycleValues = Object.values(subprocessCounts);
      
      if (cycleValues.length === 0) {
        return;
      }
      
      const maxCycleCount = Math.max(...cycleValues);
      
      if (maxCycleCount === 0) {
        return;
      }
      
      Object.keys(subprocessCounts).forEach(subprocessName => {
        const count = subprocessCounts[subprocessName];
        
        if (count === 0) {
          allFrequencies[process.name][subprocessName] = {
            occurrences: 1,
            units: 1
          };
          return;
        }
        
        // Calculate units per occurrence without rounding
        const unitsPerOccurrence = maxCycleCount / count;
        
        // Store frequency with exact calculated value
        allFrequencies[process.name][subprocessName] = {
          occurrences: 1,
          units: unitsPerOccurrence
        };
      });
    });
    
    return allFrequencies;
  }
  
  function proceedWithExport(filename) {
    // Confirm with user about data deletion
    if (!confirm('After successfully exporting to Excel, all recorded time data will be removed from the app. Are you sure you want to continue?')) {
      return;
    }
    
    try {
      // Final check that XLSX is available
      if (typeof XLSX === 'undefined') {
        throw new Error('XLSX library is not available. Please check your internet connection and try again.');
      }
      
      // Calculate frequencies for all processes and their subprocesses
      const allFrequencies = calculateFrequencies(state.processes);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // --- SHEET 1: Detailed Readings ---
      const allReadings = [];
      
      state.processes.forEach(process => {
        if (process.readings && process.readings.length > 0) {
          process.readings.forEach(reading => {
            // Find the subprocess
            const subprocess = process.subprocesses.find(sub => sub.name === reading.subprocess);
            const rating = subprocess ? subprocess.rating || 100 : 100;
            
            // Get frequency for this subprocess
            const processFrequencies = allFrequencies[process.name] || {};
            const frequency = processFrequencies[reading.subprocess] || { occurrences: 1, units: 1 };
            
            allReadings.push({
              "Process": process.name,
              "Subprocess": reading.subprocess,
              "Activity Type": reading.activityType || "",
              "Persons Required": reading.personCount || 1,
              "Production Quantity": reading.productionQty || 0,
              "Rating (%)": rating,
              "Remarks": reading.remarks || "",
              "Start Time": reading.formattedStartTime || "",
              "End Time": reading.formattedEndTime || ""
            });
          });
        }
      });
      
      // Convert detailed data to worksheet
      const detailedWs = XLSX.utils.json_to_sheet(allReadings);
      
      // Add detailed worksheet to workbook
      XLSX.utils.book_append_sheet(wb, detailedWs, 'Detailed Readings');
      
      // --- SHEET 2: Summary with Averages and Cycle Time ---
      const summaryData = [];
      
      state.processes.forEach(process => {
        if (process.readings && process.readings.length > 0) {
          // Get frequencies for this process
          const processFrequencies = allFrequencies[process.name] || {};
          
          // Group readings by subprocess
          const subprocessMap = {};
          
          process.readings.forEach(reading => {
            const subprocessName = reading.subprocess;
            
            if (!subprocessMap[subprocessName]) {
              // Find the subprocess
              const subprocess = process.subprocesses.find(sub => sub.name === subprocessName);
              
              // Get frequency for this subprocess
              const frequency = processFrequencies[subprocessName] || { occurrences: 1, units: 1 };
              
              subprocessMap[subprocessName] = {
                times: [],
                activityType: reading.activityType || "",
                productionQty: reading.productionQty || 0,
                rating: subprocess ? subprocess.rating || 100 : 100,
                occurrencesPerCycle: frequency.occurrences,
                unitsPerOccurrence: frequency.units,
                readings: []
              };
            }
            
            // Store times for average calculation
            subprocessMap[subprocessName].times.push(reading.time || 0);
            
            // Keep reference to all readings for this subprocess
            subprocessMap[subprocessName].readings.push(reading);
            
            // Update activity type if it was blank but now has a value
            if (!subprocessMap[subprocessName].activityType && reading.activityType) {
              subprocessMap[subprocessName].activityType = reading.activityType;
            }
          });
          
          // Calculate values for each subprocess
          Object.keys(subprocessMap).forEach(subprocessName => {
            const data = subprocessMap[subprocessName];
            const times = data.times;
            
            // Calculate average time in seconds
            const totalTimeMs = times.reduce((sum, time) => sum + time, 0);
            const avgTimeMs = totalTimeMs / times.length;
            const avgTimeSec = avgTimeMs / 1000;
            
            // FIX: Correct order of calculations
            const cycleTime = avgTimeSec / data.productionQty;
            const basicTimeSec = cycleTime * (data.rating / 100);
            const effectiveTime = basicTimeSec * frequencyStr;
            
            // Format frequency as string for display
            const frequencyStr = `${data.occurrencesPerCycle}/${data.unitsPerOccurrence.toFixed(2)}`;
            
            summaryData.push({
              "Process": process.name,
              "Subprocess": subprocessName,
              "Activity Type": data.activityType,
              "Average Time (sec)": avgTimeSec.toFixed(1),
              "Rating (%)": data.rating,
              "Basic Time (sec)": basicTimeSec.toFixed(1),
              "Frequency": frequencyStr,
              "Effective Time (sec)": effectiveTime.toFixed(1),
              "Cycle Time (sec)": cycleTime.toFixed(1),
              "Production Quantity": data.productionQty
            });
          });
        }
      });
      
      // If summary data exists, create and add the summary worksheet
      if (summaryData.length > 0) {
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        
        // Customize the column widths in summary sheet (for better readability)
        const wsColWidth = [
          {wch: 15}, // Process
          {wch: 20}, // Subprocess
          {wch: 12}, // Activity Type
          {wch: 15}, // Average Time (sec)
          {wch: 12}, // Rating (%)
          {wch: 15}, // Basic Time (sec)
          {wch: 12}, // Frequency
          {wch: 15}, // Effective Time (sec)
          {wch: 15}, // Cycle Time (sec)
          {wch: 15}  // Production Quantity
        ];
        summaryWs['!cols'] = wsColWidth;
        
        // Add to workbook as "Process Summary"
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Process Summary');
      }
      
      // Export the Excel file
      try {
        XLSX.writeFile(wb, filename + '.xlsx');
        console.log('Export successful using standard XLSX.writeFile');
        
        // Only clear data if export was successful
        clearAllReadingsData();
        
      } catch (standardError) {
        console.error('Standard XLSX.writeFile failed:', standardError);
        
        // Try alternative method for browsers that don't support writeFile
        try {
          const wb_out = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
          
          function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
          }
          
          const blob = new Blob([s2ab(wb_out)], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename + '.xlsx';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Only clear data if export was successful
            clearAllReadingsData();
            
          }, 100);
          
        } catch (alternativeError) {
          console.error('Alternative export method failed:', alternativeError);
          throw new Error('Excel export failed. Please try CSV export instead.');
        }
      }
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('There was an error exporting to Excel: ' + error.message);
      
      // Data is NOT cleared if there's an error
      
      // Offer CSV fallback
      if (confirm('Would you like to try exporting as CSV instead?')) {
        showModal('Export to CSV', `
          <div>
            <label for="export-filename" style="display: block; margin-bottom: 8px;">Enter filename (without extension):</label>
            <input type="text" id="export-filename" value="time_motion_study" style="width: 100%; padding: 10px; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
              <button onclick="confirmCSVExport()" class="btn-success" style="flex: 1;">Export as CSV</button>
              <button onclick="closeModal()" class="btn-secondary" style="flex: 1;">Cancel</button>
            </div>
          </div>
        `);
        
        // Focus the input field
        setTimeout(() => {
          const input = document.getElementById('export-filename');
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      }
    }
  }
  
  
  function exportToCSV(filename) {
    // Confirm with user about data deletion
    if (!confirm('After successfully exporting to CSV, all recorded time data will be removed from the app. Are you sure you want to continue?')) {
      return;
    }
    
    try {
      // Calculate frequencies for all processes
      const allFrequencies = calculateFrequencies(state.processes);
      
      // Prepare data for CSV
      const allReadings = [];
      
      state.processes.forEach(process => {
        if (process.readings && process.readings.length > 0) {
          process.readings.forEach(reading => {
            // Find the subprocess
            const subprocess = process.subprocesses.find(sub => sub.name === reading.subprocess);
            const rating = subprocess ? subprocess.rating || 100 : 100;
            
            // Get frequency for this subprocess
            const processFrequencies = allFrequencies[process.name] || {};
            const frequency = processFrequencies[reading.subprocess] || { occurrences: 1, units: 1 };
            const frequencyStr = `${frequency.occurrences}/${frequency.units.toFixed(2)}`;
            
            allReadings.push({
              "Process": process.name,
              "Subprocess": reading.subprocess,
              "Activity Type": reading.activityType || "",
              "Persons Required": reading.personCount || 1,
              "Production Quantity": reading.productionQty || 0,
              "Rating (%)": rating,
              "Frequency": frequencyStr,
              "Remarks": reading.remarks || "",
              "Start Time": reading.formattedStartTime || "",
              "End Time": reading.formattedEndTime || ""
            });
          });
        }
      });
      
      // Generate CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers for detailed readings
      csvContent += "DETAILED READINGS\r\n";
      const headers = ["Process", "Subprocess", "Activity Type", "Persons Required", 
                      "Production Quantity", "Rating (%)", "Frequency", "Remarks", 
                      "Start Time", "End Time"];
      csvContent += headers.join(",") + "\r\n";
      
      // Add rows for detailed readings
      allReadings.forEach(reading => {
        const row = [
          `"${reading["Process"]}"`, 
          `"${reading["Subprocess"]}"`,
          `"${reading["Activity Type"]}"`,
          reading["Persons Required"],
          reading["Production Quantity"],
          reading["Rating (%)"],
          `"${reading["Frequency"]}"`,
          `"${reading["Remarks"].replace(/"/g, '""')}"`, // Escape quotes in remarks
          `"${reading["Start Time"]}"`,
          `"${reading["End Time"]}"`
        ];
        csvContent += row.join(",") + "\r\n";
      });
      
      // Add separator
      csvContent += "\r\n\r\n";
      
      // Add summary section
      csvContent += "PROCESS SUMMARY\r\n";
      
      // Summary headers
      const summaryHeaders = [
        "Process", "Subprocess", "Activity Type", "Average Time (sec)", 
        "Rating (%)", "Basic Time (sec)", "Frequency", "Effective Time (sec)", 
        "Cycle Time (sec)", "Production Quantity"
      ];
      csvContent += summaryHeaders.join(",") + "\r\n";
      
      // Generate summary data
      const summaryData = [];
      
      state.processes.forEach(process => {
        if (process.readings && process.readings.length > 0) {
          // Get frequencies for this process
          const processFrequencies = allFrequencies[process.name] || {};
          
          // Group readings by subprocess
          const subprocessMap = {};
          
          process.readings.forEach(reading => {
            const subprocessName = reading.subprocess;
            
            if (!subprocessMap[subprocessName]) {
              // Find the subprocess
              const subprocess = process.subprocesses.find(sub => sub.name === subprocessName);
              
              // Get frequency for this subprocess
              const frequency = processFrequencies[subprocessName] || { occurrences: 1, units: 1 };
              
              subprocessMap[subprocessName] = {
                times: [],
                activityType: reading.activityType || "",
                productionQty: reading.productionQty || 0,
                rating: subprocess ? subprocess.rating || 100 : 100,
                occurrencesPerCycle: frequency.occurrences,
                unitsPerOccurrence: frequency.units,
                readings: []
              };
            }
            
            // Store times for average calculation
            subprocessMap[subprocessName].times.push(reading.time || 0);
            
            // Keep reference to all readings for this subprocess
            subprocessMap[subprocessName].readings.push(reading);
            
            // Update activity type if it was blank but now has a value
            if (!subprocessMap[subprocessName].activityType && reading.activityType) {
              subprocessMap[subprocessName].activityType = reading.activityType;
            }
          });
          
          // Calculate values for each subprocess
          Object.keys(subprocessMap).forEach(subprocessName => {
            const data = subprocessMap[subprocessName];
            const times = data.times;
            
            // Calculate average time in seconds
            const totalTimeMs = times.reduce((sum, time) => sum + time, 0);
            const avgTimeMs = totalTimeMs / times.length;
            const avgTimeSec = avgTimeMs / 1000;
            
            // FIX: Correct order of calculations
            const cycleTime = avgTimeSec / data.unitsPerOccurrence;
            const basicTimeSec = cycleTime * (data.rating / 100);
            const effectiveTime = basicTimeSec * (data.occurrencesPerCycle / data.unitsPerOccurrence);
            
            // Format frequency as string for display
            const frequencyStr = `${data.occurrencesPerCycle}/${data.unitsPerOccurrence.toFixed(2)}`;
            
            // Add to summary data
            const summaryRow = [
              `"${process.name}"`,
              `"${subprocessName}"`,
              `"${data.activityType}"`,
              avgTimeSec.toFixed(1),
              data.rating,
              basicTimeSec.toFixed(1),
              `"${frequencyStr}"`,
              effectiveTime.toFixed(1),
              cycleTime.toFixed(1),
              data.productionQty
            ];
            
            csvContent += summaryRow.join(",") + "\r\n";
          });
        }
      });
      
      try {
        // Create a download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link); // Required for FF
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        // Clear data ONLY after successful export
        clearAllReadingsData();
        
        // Show success notification
        showNotification("CSV export complete", 3000);
        
      } catch (downloadError) {
        console.error('Error creating download link:', downloadError);
        throw new Error('Could not create the download link');
      }
      
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('There was an error exporting to CSV: ' + error.message);
      
      // Do NOT clear data in case of error
    }
  }
  // Clear all readings data after export
  // Fix the clearAllReadingsData function
 // Improved clearAllReadingsData function
// Updated clearAllReadingsData function to completely reset the application
function clearAllReadingsData() {
    console.log("Clearing all data...");
    
    // Clear all processes from the state
    state.processes = [];
    
    // Reset all state variables
    state.timers = {};
    state.timerIntervals = {};
    state.editMode = false;
    state.editProcessIndex = null;
    state.activeProcess = null;
    state.activeSubprocess = null;
    
    // Clear any active timer intervals
    Object.keys(state.timerIntervals).forEach(key => {
      clearInterval(state.timerIntervals[key]);
      delete state.timerIntervals[key];
    });
    
    // Force re-render of the interface
    renderInterface();
    
    // Hide tables if they're visible (desktop view)
    if (processTableContainer) {
      processTableContainer.style.display = 'none';
    }
    if (recordedTimesContainer) {
      recordedTimesContainer.style.display = 'none';
    }
    
    // Clear process input field
    if (processInput) {
      processInput.value = '';
    }
    
    // Update localStorage - completely clear the timeMotionData item
    localStorage.removeItem('timeMotionData');
    
    // Show notification
    showNotification("All data has been cleared after export", 3000);
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
                    <option value="RNVA" ${subprocess.activityType === 'RNVA' ? 'selected' : ''}>RNVA</option>
                  </select>
                </div>
                
                <div class="input-group">
                  <label for="remarks-${processIndex}-${subprocessIndex}">Remarks:</label>
                  <input type="text" id="remarks-${processIndex}-${subprocessIndex}" class="remarks-input" 
                    value="${subprocess.remarks || ''}" placeholder="Add remarks">
                </div>
                <div class="input-group">
                  <label for="production-qty-${processIndex}-${subprocessIndex}">Production:</label>
                  <input type="number" id="production-qty-${processIndex}-${subprocessIndex}" class="production-qty-input" 
                    value="${subprocess.productionQty || 0}" min="0">
                </div>
                <div class="input-group">
                  <label for="person-count-${processIndex}-${subprocessIndex}">Persons:</label>
                  <input type="number" id="person-count-${processIndex}-${subprocessIndex}" class="person-count-input" 
                    value="${subprocess.personCount || 1}" min="1" max="100">
                </div>
                <div class="input-group">
                  <label for="rating-${processIndex}-${subprocessIndex}">Rating (%):</label>
                  <input type="number" id="rating-${processIndex}-${subprocessIndex}" class="rating-input" 
                    value="${subprocess.rating || 100}" min="60" max="150" step="5">
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
  // Render the recorded times table for desktop view
  
  function renderRecordedTimes() {
    recordedTimesTableBody.innerHTML = '';
    let hasReadings = false;
    
    state.processes.forEach((process, processIndex) => {
      if (process.readings && process.readings.length > 0) {
        hasReadings = true;
        
        process.readings.forEach((reading, idx) => {
          // Find the subprocess to get the rating
          const subprocess = process.subprocesses.find(sub => sub.name === reading.subprocess);
          const rating = subprocess ? subprocess.rating || 100 : 100;
          
          const row = document.createElement('tr');
          
          row.innerHTML = `
            <td>${process.name}</td>
            <td>${reading.subprocess}</td>
            <td>${reading.formattedTime}</td>
            <td>${reading.activityType || ""}</td>
            <td>${reading.personCount || 1}</td>
            <td>${reading.remarks || ""}</td>
            <td>${rating}%</td>
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
    
    // Only show the container if there are readings
    recordedTimesContainer.style.display = hasReadings ? 'block' : 'none';
    
    // Log to debug
    console.log("Rendering recorded times. Has readings:", hasReadings);
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
    
    // Add the new subprocess with rating field
    process.subprocesses.push({
      name: subprocessName,
      time: 0,
      formattedTime: '00:00:00',
      completed: false,
      activityType: '',   // VA or NVA
      remarks: '',        // Remarks
      personCount: 1,     // Default number of persons required
      productionQty: 0,   // Production quantity field
      rating: 100         // NEW: Default rating 100%
    });
    
    subprocessInput.value = '';
    renderInterface();
    
    // Save to localStorage
    saveToLocalStorage();
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
    
    // Add rating field to mobile view
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
        <label for="production-qty-${processIndex}-${subprocessIndex}">Production</label>
        <input type="number" id="production-qty-${processIndex}-${subprocessIndex}" class="production-qty-input" 
          value="${subprocess.productionQty || 0}" min="0">
      </div>
      
      <!-- Add rating field here -->
      <div class="input-group">
        <label for="rating-${processIndex}-${subprocessIndex}">Rating (%)</label>
        <input type="number" id="rating-${processIndex}-${subprocessIndex}" class="rating-input" 
          value="${subprocess.rating || 100}" min="60" max="150" step="5">
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
          // Find the subprocess to get the rating
          const subprocess = process.subprocesses.find(sub => sub.name === reading.subprocess);
          const rating = subprocess ? subprocess.rating || 100 : 100;
          
          allReadings.push({
            ...reading, 
            processIndex, 
            readingIndex: idx, 
            rating: rating
          });
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
            <div><strong>Activity:</strong> ${reading.activityType || "—"} | <strong>Persons:</strong> ${reading.personCount} | <strong>Rating:</strong> ${reading.rating}%</div>
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
