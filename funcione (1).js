// ══════════════════════════════════════════════════════
//  funciones.js  –  SchoolQuery · INATEC
//  Firebase Auth + Firestore role-based redirect
// ══════════════════════════════════════════════════════

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection,
         query, where, getDocs }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword,
         sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── Configuración ──────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDAuN2EhtFPU5z-juSI52z1SsqYCzI1i5k",
  authDomain:        "schoolquery-215c4.firebaseapp.com",
  projectId:         "schoolquery-215c4",
  storageBucket:     "schoolquery-215c4.firebasestorage.app",
  messagingSenderId: "694816390315",
  appId:             "1:694816390315:web:ce0b9dccaf9c1897d6cbee",
  measurementId:     "G-Y2XHE7XQ2R"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Tablas/colecciones por rol, campo de correo y ruta destino ───
const ROLES = [
  { coleccion: "administrador",            campoCorreo: "correo_admin",     ruta: "admin.html"   },
  { coleccion: "maestro",          campoCorreo: "correo",    ruta: "maestro.html" },
  { coleccion: "estudiantes", campoCorreo: "correo", ruta: "principal_alumno.html"  },
];

// ── Helpers visuales (SweetAlert2) ────────────────────
function mostrarCarga(mensaje = "Verificando credenciales…") {
  Swal.fire({
    title: mensaje,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
    background: "#ffffff",
    color: "#0f1b2d",
  });
}

function mostrarError(titulo, texto) {
  Swal.fire({
    icon:              "error",
    title:             titulo,
    text:              texto,
    confirmButtonText: "Entendido",
    confirmButtonColor:"#1a6fc4",
    background:        "#ffffff",
    color:             "#0f1b2d",
  });
}

function mostrarExito(nombre, rol) {
  const rolesLabel = {
    admin:            "Administrador",
    maestro:          "Maestro",
    principal_alumno: "Alumno / Acudiente",
  };
  Swal.fire({
    icon:              "success",
    title:             `¡Bienvenido, ${nombre}!`,
    text:              `Accediendo como ${rolesLabel[rol] ?? rol}…`,
    timer:             1800,
    showConfirmButton: false,
    background:        "#ffffff",
    color:             "#0f1b2d",
  });
}

// ── Traducir códigos de error de Firebase ─────────────
function traducirError(code) {
  const mapa = {
    "auth/user-not-found":        "No existe una cuenta con ese correo.",
    "auth/wrong-password":        "La contraseña es incorrecta.",
    "auth/invalid-email":         "El correo electrónico no tiene un formato válido.",
    "auth/user-disabled":         "Esta cuenta ha sido deshabilitada.",
    "auth/too-many-requests":     "Demasiados intentos fallidos. Intenta más tarde.",
    "auth/network-request-failed":"Sin conexión. Verifica tu red e intenta de nuevo.",
    "auth/invalid-credential":    "Correo o contraseña incorrectos.",
  };
  return mapa[code] ?? "Ocurrió un error inesperado. Intenta de nuevo.";
}

// ── Buscar el rol del usuario en Firestore ─────────────
async function obtenerRol(email) {
  for (const { coleccion, campoCorreo, ruta } of ROLES) {
    // Línea de depuración para ver el proceso en la consola (F12)
    console.log(`[DEBUG] Buscando en colección: "${coleccion}" donde el campo "${campoCorreo}" sea igual a "${email}"`);
    
    const q    = query(collection(db, coleccion), where(campoCorreo, "==", email));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      console.log(`[DEBUG] ¡Éxito! Usuario encontrado en la colección "${coleccion}".`);
      const datos = snap.docs[0].data();
      return {
        rol:    coleccion,
        ruta,
        nombre: datos.nombre ?? datos.name ?? email.split("@")[0],
        datos,
      };
    }
  }
  console.warn(`[DEBUG] El correo "${email}" no se encontró en ninguna colección de Firestore.`);
  return null; // correo no encontrado en ninguna colección
}

// ── Lógica principal de inicio de sesión ──────────────
async function handleLogin() {
  const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPass").value;
  const terms    = document.getElementById("termsCheckbox").checked;

  // Validaciones previas
  if (!email || !password) {
    mostrarError("Campos vacíos", "Por favor completa el correo y la contraseña.");
    return;
  }
  if (!terms) {
    mostrarError("Términos requeridos", "Debes aceptar los Términos y la Política de Privacidad para continuar.");
    return;
  }

  mostrarCarga("Verificando credenciales…");

  try {
    // 1. Autenticar con Firebase Auth
    await signInWithEmailAndPassword(auth, email, password);

    // 2. Buscar rol en Firestore
    mostrarCarga("Buscando perfil de usuario…");
    const perfil = await obtenerRol(email);

    if (!perfil) {
      // Autenticado pero sin perfil asignado en ninguna colección
      await auth.signOut();
      mostrarError(
        "Sin perfil asignado",
        "Tu cuenta existe pero no tiene un rol asignado en el sistema. Contacta al administrador."
      );
      return;
    }

    // 3. Guardar sesión en sessionStorage
    sessionStorage.setItem("sq_usuario", JSON.stringify({
      email,
      rol:    perfil.rol,
      nombre: perfil.nombre,
    }));

    // 4. Mostrar bienvenida y redirigir
    mostrarExito(perfil.nombre, perfil.rol);
    setTimeout(() => {
      window.location.href = perfil.ruta;
    }, 1900);

  } catch (error) {
    mostrarError("Error al ingresar", traducirError(error.code));
  }
}

// ── Recuperación de contraseña ─────────────────────────
window.handleForgotPassword = async function () {
  const { value: email } = await Swal.fire({
    title:             "Recuperar contraseña",
    input:             "email",
    inputLabel:        "Ingresa tu correo institucional",
    inputPlaceholder:  "usuario@gmail.com",
    confirmButtonText: "Enviar enlace",
    confirmButtonColor:"#1a6fc4",
    showCancelButton:  true,
    cancelButtonText:  "Cancelar",
    background:        "#ffffff",
    color:             "#0f1b2d",
    inputValidator: (v) => !v && "Por favor ingresa un correo.",
  });

  if (!email) return;

  mostrarCarga("Enviando enlace de recuperación…");
  try {
    await sendPasswordResetEmail(auth, email);
    Swal.fire({
      icon:              "success",
      title:             "Correo enviado",
      text:              `Se envió un enlace de recuperación a ${email}.`,
      confirmButtonColor:"#1a6fc4",
      background:        "#ffffff",
      color:             "#0f1b2d",
    });
  } catch (error) {
    mostrarError("Error", traducirError(error.code));
  }
};

// ── Contactar admin ────────────────────────────────────
window.contactAdmin = function () {
  Swal.fire({
    icon:              "info",
    title:             "Contactar Administrador",
    html:              `<p style="font-size:.9rem;color:#5a6b80;line-height:1.6">
                          Escribe a <strong>soporte@inatec.edu.ni</strong><br>
                          o llama a <strong>(505) 2255-0000</strong><br>
                          en horario de lunes a viernes, 8 a.m. – 5 p.m.
                        </p>`,
    confirmButtonText: "Cerrar",
    confirmButtonColor:"#1a6fc4",
    background:        "#ffffff",
    color:             "#0f1b2d",
  });
};

// ── Modales Términos y Privacidad ──────────────────────
window.abrirTerminos = function () {
  document.getElementById("modalContent").innerHTML = `
    <h2>Términos y Condiciones</h2>
    <p><strong>Última actualización:</strong> enero 2025</p>
    <p>Al utilizar SchoolQuery aceptas las siguientes condiciones:</p>
    <ul>
      <li>El acceso al sistema es exclusivo para personal y alumnos activos de los centros registrados.</li>
      <li>Las credenciales son personales e intransferibles.</li>
      <li>Queda prohibido compartir, copiar o divulgar información académica sin autorización.</li>
      <li>El mal uso del sistema puede derivar en sanciones disciplinarias conforme al reglamento interno.</li>
      <li>Los centros registrados se les reserva el derecho de suspender cuentas que infrinjan estas normas.</li>
    </ul>
    <p>Para dudas escribe a <strong>schoolquery1@gmail.com</strong>.</p>
  `;
  document.getElementById("modalOverlay").style.display = "flex";
};

window.abrirPrivacidad = function () {
  document.getElementById("modalContent").innerHTML = `
    <h2>Política de Privacidad</h2>
    <p><strong>Última actualización:</strong> enero 2025</p>
    <p>SchoolQuery recopila y trata los siguientes datos:</p>
    <ul>
      <li><strong>Datos de identificación:</strong> nombre, correo institucional y rol académico.</li>
      <li><strong>Datos de uso:</strong> fecha/hora de acceso e interacciones con el sistema.</li>
    </ul>
    <p>Estos datos se utilizan exclusivamente para la gestión académica interna y no se comparten con terceros sin consentimiento expreso, salvo requerimiento legal.</p>
    <p>Tienes derecho a solicitar acceso, corrección o eliminación de tus datos escribiendo a <strong>schoolquery1@gmail.com</strong>.</p>
  `;
  document.getElementById("modalOverlay").style.display = "flex";
};

window.cerrarModal = function (e) {
  if (e.target.id === "modalOverlay") {
    document.getElementById("modalOverlay").style.display = "none";
  }
};

window.cerrarModalDirecto = function () {
  document.getElementById("modalOverlay").style.display = "none";
};

// ── Bind del botón de login ────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnLoginSubmit");
  if (btn) btn.addEventListener("click", handleLogin);

  // Permitir Enter en los campos
  ["loginEmail", "loginPass"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });
});