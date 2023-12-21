const socket = io();
console.log("Socket.IO client initialized");

socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
  socket.emit('joinRoom', sessionName);
});

socket.on('qrCode', data => {
  console.log("QR Code received:", data);
  const img = document.getElementById('qrCodeImage');
  if (img && data.sessionName === sessionName) {
    img.src = data.url;
  }
});

socket.on('connectionOpen', () => {
  document.getElementById('qrCodeImage').classList.add('hidden');
  document.getElementById('successMessage').classList.remove('hidden');
});
