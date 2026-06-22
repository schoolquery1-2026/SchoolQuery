// Importaciones de Firebase (SDK Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, Timestamp, getCountFromServer, getDocs, query, where, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
 
// Configuración del proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDAuN2EhtFPU5z-juSI52z1SsqYCzI1i5k",
  authDomain: "schoolquery-215c4.firebaseapp.com",
  projectId: "schoolquery-215c4",
  storageBucket: "schoolquery-215c4.firebasestorage.app",
  messagingSenderId: "694816390315",
  appId: "1:694816390315:web:ce0b9dccaf9c1897d6cbee",
  measurementId: "G-Y2XHE7XQ2R"
};
 
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
 
// --- FUNCIONES DE NAVEGACIÓN Y CONTROL DESPLEGABLE ---
 
window.toggleDashboardMenu = function() {
  const menu = document.getElementById('dashboardOptions');
  const arrow = document.getElementById('dashboardArrow');
  if (menu && arrow) {
    menu.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
  }
}
 
// ── TEMPORIZADOR DE INACTIVIDAD CON SWEETALERT2 ──
let temporizadorInactividad;
const TIEMPO_LIMITE = 9000000; // 15 minutos en milisegundos

function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(ejecutarCierreSesion, TIEMPO_LIMITE);
}

async function ejecutarCierreSesion() {
    // Desactivar los escuchadores para que no se reinicie el contador mientras está la alerta
    removerEscuchadores();

    // Lanzar la alerta estética de SweetAlert2
    await Swal.fire({
        title: '¡Sesión Expirada!',
        text: 'Tu sesión ha sido cerrada automáticamente por inactividad.',
        icon: 'warning',
        confirmButtonText: 'Volver al Inicio',
        confirmButtonColor: '#2563eb', // Azul Tailwind que combina con tu diseño
        allowOutsideClick: false,
        allowEscapeKey: false,
        heightAuto: false
    });
    
    // El código espera a que el usuario presione el botón para continuar con el redireccionamiento
    if (typeof auth !== 'undefined') {
        try {
            await auth.signOut();
            window.location.href = "index.html"; 
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            window.location.href = "index.html";
        }
    } else {
        window.location.href = "index.html";
    }
}

// Detectar cualquier interacción del usuario en la pantalla
const eventosDeActividad = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];

function activarEscuchadores() {
    eventosDeActividad.forEach(evento => {
        document.addEventListener(evento, reiniciarTemporizador);
    });
}

function removerEscuchadores() {
    eventosDeActividad.forEach(evento => {
        document.removeEventListener(evento, reiniciarTemporizador);
    });
}

// Iniciar el sistema de control
activarEscuchadores();
reiniciarTemporizador();

window.showSection = function(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  const targetSection = document.getElementById(section);
  if (targetSection) targetSection.classList.remove('hidden');
 
  document.getElementById('pageTitle').textContent = {
    'dashboard': 'Dashboard Administrativo',
    'estudiantes': 'Gestión de Estudiantes',
    'maestros': 'Gestión de Maestros',
    'grupos': 'Gestión de Grupos',
    'notes': 'Gestión de Notas'
  }[section];
 
  const menuLinks = ['dashboard', 'estudiantes', 'maestros', 'grupos', 'notes'];
  menuLinks.forEach(item => {
    const link = document.getElementById(`link-${item}`);
    if (link) {
      link.classList.remove('bg-blue-600', 'text-white', 'font-semibold', 'shadow-md');
      link.classList.add('text-gray-600', 'hover:text-blue-600', 'hover:bg-gray-50');
    }
  });
 
  const activeLink = document.getElementById(`link-${section}`);
  if (activeLink) {
    activeLink.classList.remove('text-gray-600', 'hover:text-blue-600', 'hover:bg-gray-50');
    activeLink.classList.add('bg-blue-600', 'text-white', 'font-semibold', 'shadow-md');
  }
}
 
window.volverPaginaPrincipal = function() {
  window.location.href = "index.html";
}
 
// --- FUNCIONES DE VALIDACIÓN AUXILIARES ---
function esSoloLetras(texto) {
  const patron = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  return patron.test(texto);
}
 
function esCorreoValido(correo) {
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patron.test(correo);
}
 
// --- CARGA DE DROPDOWNS ---
// CORRECCIÓN #2: typo "assignar" → "asignar" en el ID del dropdown de estudiante
// CORRECCIÓN #5: se agrega dropdownMigrarNuevo para poblar el segundo select de migración
window.cargarGruposDropdown = async function() {
  const dropdownEst        = document.getElementById('id_grupo_estudiante');
  const dropdownM_Asignar  = document.getElementById('id_grupo_asignar_maestro');
  const dropdownE_Asignar  = document.getElementById('id_grupo_asignar_estudiante');  // ✅ typo corregido
  const dropdownMigrar     = document.getElementById('id_grupo_actual_migrar');
  const dropdownMigrarNuevo = document.getElementById('id_grupo_nuevo_migrar');        // ✅ ahora se puebla
  const dropdownFiltro     = document.getElementById('filtro_id_grupo');
 
  try {
    const snapshot = await getDocs(collection(db, "Grupos"));
    const gruposUnicos = new Map();
 
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.id_grupo && !gruposUnicos.has(data.id_grupo)) {
        gruposUnicos.set(data.id_grupo, data.correo_maestro || "");
      }
    });
 
    let opcionesHTML       = '<option value="" disabled selected>Seleccione un Grupo</option>';
    let opcionesFiltroHTML = '<option value="todos">Mostrar Todos</option>';
 
    gruposUnicos.forEach((maestro, id_grupo) => {
      opcionesHTML       += `<option value="${id_grupo}" data-maestro="${maestro}">${id_grupo}</option>`;
      opcionesFiltroHTML += `<option value="${id_grupo}">${id_grupo}</option>`;
    });
 
    if (dropdownEst)         dropdownEst.innerHTML         = opcionesHTML;
    if (dropdownM_Asignar)   dropdownM_Asignar.innerHTML   = opcionesHTML;
    if (dropdownE_Asignar)   dropdownE_Asignar.innerHTML   = opcionesHTML;
    if (dropdownMigrar)      dropdownMigrar.innerHTML      = opcionesHTML;
    if (dropdownMigrarNuevo) dropdownMigrarNuevo.innerHTML = opcionesHTML; // ✅ poblado
    if (dropdownFiltro)      dropdownFiltro.innerHTML      = opcionesFiltroHTML;
 
    console.log(`✅ Dropdowns mapeados con ${gruposUnicos.size} grupos.`);
    cargarTablaGrupos();
 
  } catch (error) {
    console.error("❌ Error al cargar grupos:", error);
    const errorHTML = '<option value="" disabled selected>Error al cargar</option>';
    if (dropdownEst)         dropdownEst.innerHTML         = errorHTML;
    if (dropdownFiltro)      dropdownFiltro.innerHTML      = '<option value="todos">Error al cargar</option>';
  }
}
 
// --- ACCIONES DEL FORMULARIO CON FIREBASE ---
 
window.registrarEstudiante = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede registrar al estudiante.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const nombre         = document.getElementById('nombre').value.trim();
  const apellido       = document.getElementById('apellido').value.trim();
  const fechaNacimiento = document.getElementById('fecha_nacimiento').value;
  const correo         = document.getElementById('correo').value.trim();
  const idGrupoSelect  = document.getElementById('id_grupo_estudiante').value;
  const dropdownElement = document.getElementById('id_grupo_estudiante');
  const correoMaestroSelect = dropdownElement.options[dropdownElement.selectedIndex]?.getAttribute('data-maestro') || "";
 
  if (!nombre || !apellido || !fechaNacimiento || !correo || !idGrupoSelect) return;
  if (!esSoloLetras(nombre) || !esSoloLetras(apellido)) return;
  if (!esCorreoValido(correo)) return;
 
  const boton = document.querySelector('#formEstudiante button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Registrando... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const qVerificacion = query(collection(db, "estudiantes"), where("correo", "==", correo));
    const snapVerificacion = await getDocs(qVerificacion);
 
    if (!snapVerificacion.empty) {
      Swal.fire({ icon: 'warning', title: 'Correo Duplicado', text: `El correo "${correo}" ya está registrado para un estudiante.`, confirmButtonColor: '#2563eb' });
      return;
    }
 
    const passwordGenerada = "Sch00lstudent.E";
    await createUserWithEmailAndPassword(auth, correo, passwordGenerada);
 
    const fechaObj = new Date(fechaNacimiento + "T00:00:00");
    const fechaTimestamp = Timestamp.fromDate(fechaObj);
 
    await addDoc(collection(db, "estudiantes"), {
      nombre:    nombre,
      apellido:  apellido,
      correo:    correo,
      fecha:     fechaTimestamp,
      id_grupo:  idGrupoSelect
    });
 
    await addDoc(collection(db, "Grupos"), {
      id_grupo:          idGrupoSelect,
      correo_maestro:    correoMaestroSelect,
      correo_estudiante: correo
    });
 
    Swal.fire({ icon: 'success', title: '¡Registro Exitoso!', text: 'El estudiante fue registrado y asignado a su grupo correctamente.', confirmButtonColor: '#2563eb', confirmButtonText: 'Aceptar' });
    document.getElementById('formEstudiante').reset();
    actualizarContadores();
 
  } catch (error) {
    console.error("Error al registrar estudiante:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#2563eb' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
window.registrarMaestro = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede registrar al maestro.', confirmButtonColor: '#0891b2' });
    return;
  }
 
  const nombre    = document.getElementById('m_nombre').value.trim();
  const apellido  = document.getElementById('m_apellido').value.trim();
  const correo    = document.getElementById('correo_maestro').value.trim();
  const specialty = document.getElementById('especialidad').value;
 
  if (!nombre || !apellido || !correo || !specialty) return;
  if (!esSoloLetras(nombre) || !esSoloLetras(apellido)) return;
  if (!esCorreoValido(correo)) return;
 
  const boton = document.querySelector('#formMaestro button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Registrando... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const qVerificacion = query(collection(db, "maestro"), where("correo", "==", correo));
    const snapVerificacion = await getDocs(qVerificacion);
 
    if (!snapVerificacion.empty) {
      Swal.fire({ icon: 'warning', title: 'Correo Duplicado', text: `El correo "${correo}" ya está registrado para un maestro.`, confirmButtonColor: '#0891b2' });
      return;
    }
 
    const passwordGenerada = "Sch00lmaster.M";
    await createUserWithEmailAndPassword(auth, correo, passwordGenerada);
 
    await addDoc(collection(db, "maestro"), {
      nombre:       nombre,
      apellido:     apellido,
      correo:       correo,
      especialidad: specialty
    });
 
    Swal.fire({ icon: 'success', title: '¡Registro Exitoso!', text: 'El maestro fue registrado correctamente en el sistema.', confirmButtonColor: '#0891b2', confirmButtonText: 'Aceptar' });
    document.getElementById('formMaestro').reset();
    actualizarContadores();
 
  } catch (error) {
    console.error("Error al registrar maestro:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#0891b2' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
window.crearGrupo = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede guardar el grupo.', confirmButtonColor: '#059669' });
    return;
  }
 
  const idGrupo          = document.getElementById('id_grupo').value.trim();
  const correoMaestro    = document.getElementById('g_correo_maestro').value.trim();
  const correoEstudiante = document.getElementById('g_correo_estudiante').value.trim();
 
  if (!idGrupo || !correoMaestro || !correoEstudiante) return;
 
  if (!esCorreoValido(correoMaestro) || !esCorreoValido(correoEstudiante)) {
    Swal.fire({ icon: 'error', title: 'Formato de Correo Inválido', text: 'Asegúrate de escribir correctamente los correos electrónicos.', confirmButtonColor: '#059669' });
    return;
  }
 
  const boton = document.querySelector('#formGrupo button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Procesando Grupo... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const q = query(collection(db, "Grupos"), where("id_grupo", "==", idGrupo));
    const querySnapshot = await getDocs(q);
 
    if (!querySnapshot.empty) {
      Swal.fire({ icon: 'warning', title: 'El Grupo ya Existe', text: `El grupo "${idGrupo}" ya está creado en el sistema. Puedes agregar estudiantes desde la pestaña de Estudiantes.`, confirmButtonColor: '#059669' });
      return;
    }
 
    await addDoc(collection(db, "Grupos"), {
      id_grupo:          idGrupo,
      correo_maestro:    correoMaestro,
      correo_estudiante: correoEstudiante
    });
 
    Swal.fire({ icon: 'success', title: '¡Grupo Creado!', text: `El grupo "${idGrupo}" se ha inicializado con éxito.`, confirmButtonColor: '#059669', confirmButtonText: 'Entendido' });
    document.getElementById('formGrupo').reset();
    actualizarContadores();
    cargarGruposDropdown();
 
  } catch (error) {
    console.error("Error al asignar grupo:", error);
    Swal.fire({ icon: 'error', title: 'Error en base de datos', text: error.message, confirmButtonColor: '#059669' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
window.asignarMaestroAGrupo = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede realizar la asignación.', confirmButtonColor: '#0891b2' });
    return;
  }
 
  const idGrupo       = document.getElementById('id_grupo_asignar_maestro').value;
  const correoMaestro = document.getElementById('g_correo_maestro_asignar').value.trim();
 
  if (!idGrupo || !correoMaestro) return;
 
  if (!esCorreoValido(correoMaestro)) {
    Swal.fire({ icon: 'error', title: 'Correo Inválido', text: 'El formato del correo electrónico ingresado no es correcto.', confirmButtonColor: '#0891b2' });
    return;
  }
 
  const boton = document.querySelector('#formAsignarMaestro button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Asignando... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const qVerificacion = query(collection(db, "Grupos"),
      where("id_grupo", "==", idGrupo),
      where("correo_maestro", "==", correoMaestro)
    );
    const snapVerificacion = await getDocs(qVerificacion);
 
    if (!snapVerificacion.empty) {
      Swal.fire({ icon: 'warning', title: 'Asignación Duplicada', text: `El maestro "${correoMaestro}" ya se encuentra asignado al grupo "${idGrupo}".`, confirmButtonColor: '#0891b2' });
      return;
    }
 
    await addDoc(collection(db, "Grupos"), {
      id_grupo:          idGrupo,
      correo_maestro:    correoMaestro,
      correo_estudiante: ""
    });
 
    Swal.fire({ icon: 'success', title: '¡Asignación Correcta!', text: `El maestro fue vinculado al grupo "${idGrupo}" con éxito.`, confirmButtonColor: '#0891b2' });
    document.getElementById('formAsignarMaestro').reset();
    actualizarContadores();
    cargarGruposDropdown();
 
  } catch (error) {
    console.error("Error al asignar maestro al grupo:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#0891b2' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
window.asignarEstudianteAGrupo = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede realizar la asignación.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const idGrupo          = document.getElementById('id_grupo_asignar_estudiante').value;
  const correoEstudiante = document.getElementById('g_correo_estudiante_asignar').value.trim();
 
  if (!idGrupo || !correoEstudiante) return;
 
  if (!esCorreoValido(correoEstudiante)) {
    Swal.fire({ icon: 'error', title: 'Correo Inválido', text: 'El formato del correo electrónico ingresado no es correcto.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const boton = document.querySelector('#formAsignarEstudiante button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Asignando... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const qVerificacion = query(collection(db, "Grupos"), where("correo_estudiante", "==", correoEstudiante));
    const snapVerificacion = await getDocs(qVerificacion);
 
    if (!snapVerificacion.empty) {
      const idGrupoActual = snapVerificacion.docs[0].data().id_grupo;
 
      if (idGrupoActual === idGrupo) {
        Swal.fire({ icon: 'warning', title: 'Asignación Duplicada', text: `El estudiante "${correoEstudiante}" ya se encuentra integrado en el grupo "${idGrupo}".`, confirmButtonColor: '#2563eb' });
        return;
      } else {
        const resultadoConfirma = await Swal.fire({
          icon: 'question',
          title: 'El estudiante ya está en un grupo',
          text: `Actualmente pertenece al grupo "${idGrupoActual}". ¿Deseas cambiarlo al grupo "${idGrupo}"? Sus registros previos serán migrados.`,
          showCancelButton: true,
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Sí, cambiar de grupo',
          cancelButtonText: 'Cancelar'
        });
 
        if (!resultadoConfirma.isConfirmed) return;
 
        for (const docSnap of snapVerificacion.docs) {
          await deleteDoc(docSnap.ref);
        }
      }
    }
 
    const qGrupo = query(collection(db, "Grupos"), where("id_grupo", "==", idGrupo));
    const snapGrupo = await getDocs(qGrupo);
    let correoMaestroExistente = "";
    if (!snapGrupo.empty) {
      correoMaestroExistente = snapGrupo.docs[0].data().correo_maestro || "";
    }
 
    await addDoc(collection(db, "Grupos"), {
      id_grupo:          idGrupo,
      correo_maestro:    correoMaestroExistente,
      correo_estudiante: correoEstudiante
    });
 
    const qEstudiante = query(collection(db, "estudiantes"), where("correo", "==", correoEstudiante));
    const snapEstudiante = await getDocs(qEstudiante);
    if (!snapEstudiante.empty) {
      for (const docSnap of snapEstudiante.docs) {
        await updateDoc(docSnap.ref, { id_grupo: idGrupo });
      }
    }
 
    Swal.fire({ icon: 'success', title: '¡Migración de Grupo Exitosa!', text: `El estudiante fue removido de su antiguo grupo e integrado al grupo "${idGrupo}" con éxito.`, confirmButtonColor: '#2563eb' });
    document.getElementById('formAsignarEstudiante').reset();
    actualizarContadores();
 
  } catch (error) {
    console.error("Error al asignar estudiante al grupo:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#2563eb' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
window.registrarNota = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede registrar la calificación.', confirmButtonColor: '#d97706' });
    return;
  }
 
  const correoEstudiante = document.getElementById('n_correo_estudiante').value.trim();
  const idMateria        = document.getElementById('id_materia').value.trim();
  const parcial1         = parseFloat(document.getElementById('parcial1').value);
  const parcial2         = parseFloat(document.getElementById('parcial2').value);
  const finalAnual       = parseFloat(document.getElementById('final_anual').value);
 
  if (!correoEstudiante || !idMateria || isNaN(parcial1) || isNaN(parcial2) || isNaN(finalAnual)) return;
 
  if (!esCorreoValido(correoEstudiante)) {
    Swal.fire({ icon: 'error', title: 'Correo Inválido', text: 'El correo electrónico del estudiante no tiene un formato válido.', confirmButtonColor: '#d97706' });
    return;
  }
 
  const boton = document.querySelector('#formNota button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Subiendo Nota... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const qVerificacion = query(collection(db, "Notas"),
      where("correo_estudiante", "==", correoEstudiante),
      where("id_materia", "==", idMateria)
    );
    const snapVerificacion = await getDocs(qVerificacion);
 
    if (!snapVerificacion.empty) {
      Swal.fire({ icon: 'warning', title: 'Calificación Duplicada', text: `El estudiante "${correoEstudiante}" ya tiene notas registradas en la materia "${idMateria}".`, confirmButtonColor: '#d97706' });
      return;
    }
 
    await addDoc(collection(db, "Notas"), {
      correo_estudiante:    correoEstudiante,
      id_materia:           idMateria,
      parcial1:             parcial1,
      parcial2:             parcial2,
      final_anual:          finalAnual,
      ultima_actualizacion: Timestamp.now()
    });
 
    Swal.fire({ icon: 'success', title: '¡Calificación Registrada!', text: 'Las notas del estudiante se guardaron exitosamente.', confirmButtonColor: '#d97706', confirmButtonText: 'Aceptar' });
    document.getElementById('formNota').reset();
    actualizarContadores();
 
  } catch (error) {
    console.error("Error al registrar nota:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#d97706' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
window.logout = async function() {
  const resultado = await Swal.fire({
    title: '¿Cerrar sesión?',
    text: '¿Estás seguro de que deseas salir del panel administrativo?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444', 
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, salir',
    cancelButtonText: 'Cancelar',
    heightAuto: false // <--- Esta línea evita que el layout se hunda
  });

  if (resultado.isConfirmed) {
    removerEscuchadores();
    if (typeof temporizadorInactividad !== 'undefined') clearTimeout(temporizadorInactividad);

    if (typeof auth !== 'undefined') {
      try {
        await auth.signOut();
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        window.location.href = "index.html";
      }
    } else {
      window.location.href = "index.html";
    }
  }
}
 
window.eliminarEstudiante = async function(idDoc, correo) {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No puedes eliminar registros estando sin red.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const resultado = await Swal.fire({
    title: '¿Eliminar Estudiante?',
    text: `¿Estás seguro de eliminar permanentemente a este estudiante (${correo})? Se removerá de su grupo y de todo el sistema de notas.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, borrar del sistema',
    cancelButtonText: 'Cancelar'
  });
 
  if (!resultado.isConfirmed) return;
 
  try {
    await deleteDoc(doc(db, "estudiantes", idDoc));
 
    const qGrupos = query(collection(db, "Grupos"), where("correo_estudiante", "==", correo));
    const snapGrupos = await getDocs(qGrupos);
    for (const docSnap of snapGrupos.docs) {
      await deleteDoc(docSnap.ref);
    }
 
    Swal.fire({ icon: 'success', title: 'Registro Eliminado', text: 'El estudiante fue removido correctamente de Firebase.', confirmButtonColor: '#2563eb' });
    actualizarContadores();
 
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#2563eb' });
  }
}
 
window.eliminarMaestro = async function(idDoc, correo) {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No puedes eliminar registros estando sin red.', confirmButtonColor: '#0891b2' });
    return;
  }
 
  const resultado = await Swal.fire({
    title: '¿Eliminar Maestro?',
    text: `¿Estás seguro de eliminar permanentemente a este docente (${correo})? Se romperá su asignación en los grupos actuales.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, borrar del sistema',
    cancelButtonText: 'Cancelar'
  });
 
  if (!resultado.isConfirmed) return;
 
  try {
    await deleteDoc(doc(db, "maestro", idDoc));
 
    const qGrupos = query(collection(db, "Grupos"), where("correo_maestro", "==", correo));
    const snapGrupos = await getDocs(qGrupos);
    for (const docSnap of snapGrupos.docs) {
      await deleteDoc(docSnap.ref);
    }
 
    Swal.fire({ icon: 'success', title: 'Registro Eliminado', text: 'El docente fue removido correctamente de Firebase.', confirmButtonColor: '#0891b2' });
    actualizarContadores();
 
  } catch (error) {
    console.error("Error al eliminar maestro:", error);
    Swal.fire({ icon: 'error', title: 'Error de Firebase', text: error.message, confirmButtonColor: '#0891b2' });
  }
}
 
  async function renderizarTablasDashboard() {
  const containerEstudiantes = document.getElementById('tabla_estudiantes_dashboard');
  const containerMaestros    = document.getElementById('tabla_maestros_dashboard');
  const containerNotas       = document.getElementById('tabla_notas_dashboard'); // Nuevo
 
  if (containerEstudiantes) {
    try {
      const snapshot = await getDocs(collection(db, "estudiantes"));
      let html = `
        <div class="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 mt-4 shadow-xl">
          <table class="min-w-full divide-y divide-slate-700 text-sm text-left text-slate-300">
            <thead class="bg-slate-800 text-slate-200 uppercase text-xs font-semibold">
              <tr>
                <th class="px-6 py-4">Nombre Estudiante</th>
                <th class="px-6 py-4">Correo Institucional</th>
                <th class="px-6 py-4">Grupo Actual</th>
                <th class="px-6 py-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
      `;
      if (snapshot.empty) {
        html += `<tr><td colspan="4" class="px-6 py-6 text-center text-slate-500 italic">No hay estudiantes cargados en el sistema.</td></tr>`;
      } else {
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          html += `
            <tr class="hover:bg-slate-800/40 transition-all duration-150">
              <td class="px-6 py-4 font-semibold text-white">${data.nombre || ''} ${data.apellido || ''}</td>
              <td class="px-6 py-4 text-slate-400">${data.correo || ''}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 bg-blue-950/60 text-blue-400 border border-blue-800/60 rounded-xl text-xs font-bold">${data.id_grupo || 'Sin Asignar'}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <button onclick="eliminarEstudiante('${docSnap.id}', '${data.correo}')" class="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 mx-auto shadow">
                  <i class="fas fa-trash-alt"></i> Eliminar
                </button>
              </td>
            </tr>
          `;
        });
      }
      html += `</tbody></table></div>`;
      containerEstudiantes.innerHTML = html;
    } catch (e) {
      containerEstudiantes.innerHTML = "<p class='text-red-400 text-sm font-medium'>Error al sincronizar lista de estudiantes.</p>";
    }
  }
 
  if (containerMaestros) {
    try {
      const snapshot = await getDocs(collection(db, "maestro"));
      let html = `
        <div class="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 mt-4 shadow-xl">
          <table class="min-w-full divide-y divide-slate-700 text-sm text-left text-slate-300">
            <thead class="bg-slate-800 text-slate-200 uppercase text-xs font-semibold">
              <tr>
                <th class="px-6 py-4">Nombre Docente</th>
                <th class="px-6 py-4">Correo Institucional</th>
                <th class="px-6 py-4">Especialidad Académica</th>
                <th class="px-6 py-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
      `;
      if (snapshot.empty) {
        html += `<tr><td colspan="4" class="px-6 py-6 text-center text-slate-500 italic">No hay maestros registrados en el sistema.</td></tr>`;
      } else {
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          html += `
            <tr class="hover:bg-slate-800/40 transition-all duration-150">
              <td class="px-6 py-4 font-semibold text-white">${data.nombre || ''} ${data.apellido || ''}</td>
              <td class="px-6 py-4 text-slate-400">${data.correo || ''}</td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 rounded-xl text-xs font-bold">${data.especialidad || 'General'}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <button onclick="eliminarMaestro('${docSnap.id}', '${data.correo}')" class="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 mx-auto shadow">
                  <i class="fas fa-trash-alt"></i> Eliminar
                </button>
              </td>
            </tr>
          `;
        });
      }
      html += `</tbody></table></div>`;
      containerMaestros.innerHTML = html;
    } catch (e) {
      console.error(e);
      containerMaestros.innerHTML = "<p class='text-red-400 text-sm font-medium'>Error al sincronizar lista de maestros.</p>";
    }
  }


  if (!containerNotas) {
    console.error("No se encontró el elemento con ID 'tabla_notas_dashboard'");
    return;
  }

  // Feedback visual inicial
  containerNotas.innerHTML = `<p class="p-4 text-gray-500">Conectando con Firebase...</p>`;

  try {
    console.log("Iniciando consulta a colección 'Notas'...");
    
    // Verifica que 'db' esté inicializado
    if (typeof db === 'undefined') {
        throw new Error("La instancia de base de datos (db) no está definida.");
    }

    const snapshot = await getDocs(collection(db, "Notas"));
    
    console.log(`Documentos encontrados: ${snapshot.size}`);

    if (snapshot.empty) {
      containerNotas.innerHTML = `<p class="p-4 text-gray-500 italic">No hay notas registradas.</p>`;
      return;
    }

    let html = `
      <table class="min-w-full divide-y divide-slate-700 text-sm">
        <thead class="bg-slate-800 text-slate-200">
          <tr>
            <th class="px-6 py-3">Estudiante</th>
            <th class="px-6 py-3">Materia</th>
            <th class="px-6 py-3">P1</th>
            <th class="px-6 py-3">P2</th>
            <th class="px-6 py-3">Final</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700 bg-white">
    `;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      html += `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4">${data.correo_estudiante || 'N/A'}</td>
          <td class="px-6 py-4">${data.id_materia || 'N/A'}</td>
          <td class="px-6 py-4">${data.parcial1 || 0}</td>
          <td class="px-6 py-4">${data.parcial2 || 0}</td>
          <td class="px-6 py-4 font-bold text-blue-600">${data.final_anual || 0}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    containerNotas.innerHTML = html;

  } catch (error) {
    console.error("ERROR DETALLADO AL CARGAR NOTAS:", error);
    containerNotas.innerHTML = `<p class="p-4 text-red-500">Error: ${error.message}. Revisa la consola.</p>`;
  }
}

// Asegúrate de llamar a esta función cuando cargue la página
// O dentro de tu función inicializadora
document.addEventListener("DOMContentLoaded", () => {
    renderizarTablaNotas();
});
 
// --- FUNCIONES DE DASHBOARD ---
window.actualizarContadores = async function() {
  if (!navigator.onLine) {
    console.warn("Dispositivo sin conexión. Se canceló la solicitud a Firebase.");
    document.getElementById('total_estudiantes').textContent = "Sin red";
    document.getElementById('total_maestros').textContent    = "Sin red";
    document.getElementById('total_grupos').textContent      = "Sin red";
    document.getElementById('total_notes').textContent       = "Sin red";
    return;
  }
 
  try {
    const estudiantesRef = collection(db, "estudiantes");
    const maestrosRef    = collection(db, "maestro");
    const gruposRef      = collection(db, "Grupos");
    const notasRef       = collection(db, "Notas");
 
    const [snapEstudiantes, snapMaestros, snapNotas, snapGrupos] = await Promise.all([
      getCountFromServer(estudiantesRef),
      getCountFromServer(maestrosRef),
      getCountFromServer(notasRef),
      getDocs(gruposRef)
    ]);
 
    const gruposUnicos = new Set();
    snapGrupos.forEach(doc => {
      const data = doc.data();
      if (data.id_grupo) gruposUnicos.add(data.id_grupo);
    });
 
    document.getElementById('total_estudiantes').textContent = snapEstudiantes.data().count;
    document.getElementById('total_maestros').textContent    = snapMaestros.data().count;
    document.getElementById('total_grupos').textContent      = gruposUnicos.size;
    document.getElementById('total_notes').textContent       = snapNotas.data().count;
 
    await renderizarTablasDashboard();
 
  } catch (error) {
    console.error("Error al obtener los conteos del Dashboard:", error);
    document.getElementById('total_estudiantes').textContent = "-";
    document.getElementById('total_maestros').textContent    = "-";
    document.getElementById('total_grupos').textContent      = "-";
    document.getElementById('total_notes').textContent       = "-";
  }
}
 
// CORRECCIÓN #4: nombre unificado a migrarCodigoGrupo para coincidir con el HTML
window.migrarCodigoGrupo = async function() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No tienes conexión a internet. No se puede realizar la migración.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const idActual = document.getElementById('id_grupo_actual_migrar').value;
  const idNuevo  = document.getElementById('id_grupo_nuevo_migrar').value;
 
  if (!idActual || !idNuevo) return;
 
  if (idActual === idNuevo) {
    Swal.fire({ icon: 'warning', title: 'Grupos iguales', text: 'El grupo actual y el nuevo no pueden ser el mismo.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const boton = document.querySelector('#formMigrarCodigo button[type="submit"]');
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Migrando... ⏳";
  boton.style.opacity = "0.6";
  boton.style.cursor = "not-allowed";
 
  try {
    const qGrupos      = query(collection(db, "Grupos"),      where("id_grupo", "==", idActual));
    const qEstudiantes = query(collection(db, "estudiantes"), where("id_grupo", "==", idActual));
 
    const [snapGrupos, snapEstudiantes] = await Promise.all([
      getDocs(qGrupos),
      getDocs(qEstudiantes)
    ]);
 
    const promesasGrupos      = snapGrupos.docs.map(docSnap      => updateDoc(docSnap.ref, { id_grupo: idNuevo }));
    const promesasEstudiantes = snapEstudiantes.docs.map(docSnap => updateDoc(docSnap.ref, { id_grupo: idNuevo }));
 
    await Promise.all([...promesasGrupos, ...promesasEstudiantes]);
 
    Swal.fire({ icon: 'success', title: '¡Migración Exitosa!', text: `Se actualizaron ${snapGrupos.size + snapEstudiantes.size} registros al nuevo código "${idNuevo}".`, confirmButtonColor: '#2563eb' });
    document.getElementById('formMigrarCodigo').reset();
    actualizarContadores();
    cargarGruposDropdown();
 
  } catch (error) {
    console.error("Error al migrar código:", error);
    Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#ef4444' });
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
    boton.style.opacity = "1";
    boton.style.cursor = "pointer";
  }
}
 
// CORRECCIÓN #1: cargarTablaGrupos y eliminarRelacionGrupo sacadas del bloque offline
// Ahora están al nivel global y siempre disponibles
window.cargarTablaGrupos = async function() {
  const tbody  = document.getElementById('tbody_grupos');
  const filtro = document.getElementById('filtro_id_grupo')?.value || 'todos';
 
  if (!tbody) return;
 
  try {
    const snapshot = await getDocs(collection(db, "Grupos"));
    let html = '';
    let contadorRegistros = 0;
 
    snapshot.forEach(docSnap => {
      const data             = docSnap.data();
      const idDoc            = docSnap.id;
      const idGrupo          = data.id_grupo || "Sin Código";
      const correoMaestro    = data.correo_maestro    || `<span class="text-gray-400 italic text-xs">No asignado</span>`;
      const correoEstudiante = data.correo_estudiante || `<span class="text-gray-400 italic text-xs">No asignado</span>`;
 
      if (filtro !== 'todos' && idGrupo !== filtro) return;
 
      contadorRegistros++;
      html += `
        <tr class="hover:bg-gray-50 transition duration-150">
          <td class="px-6 py-4 font-bold text-gray-900">${idGrupo}</td>
          <td class="px-6 py-4 text-gray-600 font-medium text-xs sm:text-sm">${correoMaestro}</td>
          <td class="px-6 py-4 text-gray-600 text-xs sm:text-sm">${correoEstudiante}</td>
          <td class="px-6 py-4 text-center">
            <button onclick="eliminarRelacionGrupo('${idDoc}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 transition px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 mx-auto">
              <i class="fas fa-trash-alt"></i> Remover
            </button>
          </td>
        </tr>
      `;
    });
 
    tbody.innerHTML = contadorRegistros === 0
      ? `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">No se encontraron registros activos para el criterio seleccionado.</td></tr>`
      : html;
 
  } catch (error) {
    console.error("Error al renderizar la tabla de grupos:", error);
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-semibold"><i class="fas fa-exclamation-triangle mr-1"></i> Error al conectar con Firestore.</td></tr>`;
  }
};
 
// CORRECCIÓN #3: función deduplicada — solo existe una versión limpia
window.eliminarRelacionGrupo = async function(idDoc) {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Sin conexión', text: 'No puedes eliminar asignaciones estando offline.', confirmButtonColor: '#2563eb' });
    return;
  }
 
  const resultado = await Swal.fire({
    title: '¿Remover asignación?',
    text: 'Se romperá el vínculo de este registro en el grupo. Las cuentas de acceso de los usuarios no se verán afectadas.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, remover vínculo',
    cancelButtonText: 'Cancelar'
  });
 
  if (!resultado.isConfirmed) return;
 
  try {
    await deleteDoc(doc(db, "Grupos", idDoc));
    Swal.fire({ icon: 'success', title: 'Registro Actualizado', text: 'El vínculo ha sido removido de Firebase con éxito.', confirmButtonColor: '#2563eb' });
    actualizarContadores();
    cargarGruposDropdown();
  } catch (error) {
    console.error("Error al eliminar relación de grupo:", error);
    Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#ef4444' });
  }
};
 
// --- DETECTORES AUTOMÁTICOS DE RED ---
window.addEventListener('online', () => {
  Swal.fire({ icon: 'success', title: '🟢 Conexión restablecida', text: 'Actualizando datos...', timer: 2000, showConfirmButton: false });
  actualizarContadores();
  cargarGruposDropdown();
});
 
window.addEventListener('offline', () => {
  Swal.fire({ icon: 'warning', title: '🔴 Sin conexión', text: 'Se perdió la conexión a internet.', timer: 3000, showConfirmButton: false });
  document.getElementById('total_estudiantes').textContent = "Sin red";
  document.getElementById('total_maestros').textContent    = "Sin red";
  document.getElementById('total_grupos').textContent      = "Sin red";
  document.getElementById('total_notes').textContent       = "Sin red";
});
 
window.onload = () => {
  showSection('dashboard');
  actualizarContadores();
  cargarGruposDropdown();
};