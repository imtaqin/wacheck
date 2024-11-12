const socket = io();
console.log("Socket.IO client initialized");

socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
  socket.emit('joinRoom', sessionName);
});

// Handle phone number submission
document.getElementById('submitPhoneNumber').addEventListener('click', () => {
  const phoneNumber = document.getElementById('phoneNumber').value;
  if (phoneNumber) {
    socket.emit('submitPhoneNumber', { sessionName, phoneNumber });
  } else {
    alert("Please enter a valid phone number with country code.");
  }
});

// Display the pairing code when received
socket.on('pairingCode', data => {
  console.log("Pairing Code received:", data);
  const pairingCodeElem = document.getElementById('pairingCode');
  if (pairingCodeElem && data.sessionName === sessionName) {
    document.getElementById('inputPhoneNumber').classList.add('hidden');
    document.getElementById('pairingCodeSection').classList.remove('hidden');
    pairingCodeElem.textContent = data.code;
  }
});

// Show success message when connection opens
socket.on('connectionOpen', () => {
  document.getElementById('pairingCodeSection').classList.add('hidden');
  document.getElementById('successMessage').classList.remove('hidden');
});
