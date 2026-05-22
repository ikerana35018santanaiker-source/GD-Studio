// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCYV0CPNjkzJKwG3tn7kaVSucMnWdXRD1A",
  authDomain: "gd-studio-d5fe1.firebaseapp.com",
  projectId: "gd-studio-d5fe1",
  storageBucket: "gd-studio-d5fe1.firebasestorage.app",
  messagingSenderId: "1030771979655",
  appId: "1:1030771979655:web:f175405cbe11fe741c0f22"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a servicios
const auth = firebase.auth();
const database = firebase.database();

// Configurar ReCAPTCHA
auth.languageCode = 'es';
