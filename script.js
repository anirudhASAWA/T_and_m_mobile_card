<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <title>Time and Motion Study</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <div class="header-container">
      <img src="Faber LOGO.jpg" alt="Faber Logo" class="company-logo">
    </div>
    <h1>Time and Motion Study</h1>
    <!-- Add Process Form (desktop only) -->
    <div class="form-group desktop-only">
      <input type="text" id="processInput" placeholder="Enter process name">
      <div class="button-group">
        <button id="addProcessBtn" class="btn-primary">Add Process</button>
        <button id="updateProcessBtn" class="btn-success" style="display: none;">Update Process</button>
        <button id="cancelEditBtn" class="btn-secondary" style="display: none;">Cancel</button>
      </div>
    </div>
    
    <!-- Process Table (desktop view) -->
    <div id="processTableContainer" class="desktop-only" style="display: none;">
      <div class="section-header">
        <h2>Processes</h2>
        <div class="button-group">
          <button id="exportBtn" class="btn-success">Export to Excel</button>
          <button id="saveBackupBtn" class="btn-secondary">Save Backup</button>
        </div>
      </div>
      
      <div class="table-container">
        <table id="processTable">
          <thead>
            <tr>
              <th>Process</th>
              <th>Timer</th>
              <th>Controls</th>
              <th colspan="2">Subprocesses</th>
            </tr>
          </thead>
          <tbody id="processTableBody">
            <!-- Processes will be added here -->
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Recorded Times (desktop view) -->
    <div id="recordedTimesContainer" class="desktop-only" style="display: none;">
      <div class="section-header">
        <h2>Recorded Times</h2>
      </div>
      <div class="recorded-times">
        <table id="recordedTimesTable">
          <thead>
            <tr>
              <th>Process</th>
              <th>Subprocess</th>
              <th>Time</th>
              <th>Activity Type</th>
              <th>Persons</th>
              <th>Remarks</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="recordedTimesTableBody">
            <!-- Recorded times will be added here -->
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Mobile Card Layout - Will be populated by JS -->
    <div id="mobileView" class="mobile-view"></div>
    
    <!-- Mobile Action Bar -->
    <div id="mobileActionBar" class="mobile-action-bar">
      <button id="mobileAddProcessBtn" class="btn-primary">+ Add Process</button>
      <button id="mobileExportBtn" class="btn-success">Export</button>
    </div>
  </div>

  <!-- Notification Element -->
  <div id="notification" class="notification"></div>

  <!-- Modal for mobile forms -->
  <div id="modal" class="modal">
    <div class="modal-content">
      <span class="close-button">&times;</span>
      <h3 id="modalTitle">Title</h3>
      <div id="modalBody">
        <!-- Modal content will be injected here -->
      </div>
    </div>
  </div>

  <!-- Include Excel library and app script -->
  <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>
  <script src="script.js"></script>
</body>
</html>
