
        (function() {
            // ==================== CONFIGURACIÓN ====================
            // Reemplaza con tu Client ID real de Google Cloud Console
            const GOOGLE_CLIENT_ID = 'TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com';

            // ==================== ELEMENTOS DOM ====================
            const canvas = document.getElementById('burbujasCanvas');
            const ctx = canvas.getContext('2d');
            const toggleBtn = document.getElementById('toggleBurbujas');
            const tooltipText = toggleBtn.querySelector('.tooltip-text');
            const contenedorTilt = document.getElementById('contenedorTilt');
            const tarjetaLogin = document.getElementById('tarjetaLogin');
            const formLogin = document.getElementById('formLogin');
            const inputEmail = document.getElementById('email');
            const inputPassword = document.getElementById('password');
            const btnGoogle = document.getElementById('btnGoogle');
            const linkOlvido = document.getElementById('linkOlvido');
            const linkAdmin = document.getElementById('linkAdmin');
            const linkInicio = document.getElementById('linkInicio');

            let burbujasActivas = true;
            let animacionId = null;
            let burbujas = [];
            const MAX_BURBUJAS = 55;

            // ==================== CANVAS BURBUJAS ====================
            function redimensionarCanvas() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            redimensionarCanvas();
            window.addEventListener('resize', () => {
                redimensionarCanvas();
                // Recrear burbujas proporcionalmente
                burbujas = crearBurbujasIniciales();
            });

            function crearBurbujasIniciales() {
                const arr = [];
                const cantidad = Math.min(MAX_BURBUJAS, Math.floor((canvas.width * canvas.height) / 18000));
                for (let i = 0; i < cantidad; i++) {
                    arr.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        r: Math.random() * 18 + 5,
                        dx: (Math.random() - 0.5) * 0.6,
                        dy: -(Math.random() * 0.7 + 0.3),
                        alpha: Math.random() * 0.35 + 0.08,
                        gradiente: Math.random() > 0.5 ? 'morado' : 'azul',
                    });
                }
                return arr;
            }

            burbujas = crearBurbujasIniciales();

            function dibujarBurbujas() {
                if (!burbujasActivas) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                burbujas.forEach(b => {
                    // Movimiento
                    b.x += b.dx;
                    b.y += b.dy;

                    // Reaparecer si sale
                    if (b.y + b.r < 0) {
                        b.y = canvas.height + b.r;
                        b.x = Math.random() * canvas.width;
                    }
                    if (b.x + b.r < 0) b.x = canvas.width + b.r;
                    if (b.x - b.r > canvas.width) b.x = -b.r;
                    if (b.y - b.r > canvas.height) b.y = -b.r;

                    // Pequeña oscilación lateral
                    b.x += Math.sin(Date.now() * 0.001 + b.y * 0.02) * 0.15;

                    // Dibujar
                    ctx.save();
                    ctx.globalAlpha = b.alpha;
                    const grad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b
                        .r);
                    if (b.gradiente === 'morado') {
                        grad.addColorStop(0, 'rgba(200,170,230,0.9)');
                        grad.addColorStop(0.5, 'rgba(160,120,210,0.5)');
                        grad.addColorStop(1, 'rgba(130,90,190,0.05)');
                    } else {
                        grad.addColorStop(0, 'rgba(155,200,235,0.9)');
                        grad.addColorStop(0.5, 'rgba(110,175,220,0.5)');
                        grad.addColorStop(1, 'rgba(80,150,210,0.05)');
                    }
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                    ctx.fill();

                    // Brillo
                    ctx.globalAlpha = b.alpha * 1.4;
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.beginPath();
                    ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                animacionId = requestAnimationFrame(dibujarBurbujas);
            }

            function iniciarBurbujas() {
                if (animacionId) cancelAnimationFrame(animacionId);
                if (burbujasActivas) {
                    canvas.classList.remove('oculto');
                    dibujarBurbujas();
                } else {
                    canvas.classList.add('oculto');
                }
            }
            iniciarBurbujas();

            // Toggle burbujas
            toggleBtn.addEventListener('click', () => {
                burbujasActivas = !burbujasActivas;
                if (burbujasActivas) {
                    toggleBtn.classList.remove('desactivado');
                    toggleBtn.innerHTML = '🫧 <span class="tooltip-text">Burbujas activadas</span>';
                    canvas.classList.remove('oculto');
                    dibujarBurbujas();
                } else {
                    toggleBtn.classList.add('desactivado');
                    toggleBtn.innerHTML = '💤 <span class="tooltip-text">Burbujas desactivadas</span>';
                    canvas.classList.add('oculto');
                    if (animacionId) cancelAnimationFrame(animacionId);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            });

            // ==================== EFECTO TILT CON MOUSE ====================
            let tiltTimeout;
            document.addEventListener('mousemove', (e) => {
                if (window.innerWidth < 600) return; // Desactivar en móviles pequeños
                const x = e.clientX;
                const y = e.clientY;
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const rotateX = ((y - centerY) / centerY) * -4; // -4 a 4 grados
                const rotateY = ((x - centerX) / centerX) * 5; // -5 a 5 grados

                tarjetaLogin.style.transform =
                    `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;

                // Pequeño desplazamiento del contenedor
                contenedorTilt.style.transform =
                    `translate(${(x - centerX) * 0.012}px, ${(y - centerY) * 0.012}px)`;

                clearTimeout(tiltTimeout);
                tiltTimeout = setTimeout(() => {
                    tarjetaLogin.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
                    contenedorTilt.style.transform = 'translate(0px, 0px)';
                }, 2000);
            });

            // Al salir del documento, resetear
            document.addEventListener('mouseleave', () => {
                tarjetaLogin.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
                contenedorTilt.style.transform = 'translate(0px, 0px)';
            });

            // ==================== VALIDACIONES Y SWEETALERT ====================
            function validarEmail(email) {
                const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return regex.test(email);
            }

            function mostrarErrorCampo(input, mensaje) {
                input.classList.add('error');
                input.classList.remove('valido');
                // SweetAlert toast
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'warning',
                    title: mensaje,
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-moderno',
                        title: 'swal2-title-moderno',
                    },
                    didOpen: (toast) => {
                        toast.style.borderRadius = '16px';
                        toast.style.boxShadow = '0 12px 35px rgba(0,0,0,0.15)';
                        toast.style.fontSize = '0.9rem';
                    }
                });
                // Quitar clase error después de un tiempo
                setTimeout(() => {
                    input.classList.remove('error');
                }, 2000);
            }

            function marcarValido(input) {
                input.classList.remove('error');
                input.classList.add('valido');
                setTimeout(() => {
                    input.classList.remove('valido');
                }, 2000);
            }

            // Validación en tiempo real del email
            inputEmail.addEventListener('blur', () => {
                const email = inputEmail.value.trim();
                if (email === '') {
                    mostrarErrorCampo(inputEmail, 'El correo electrónico no puede estar vacío.');
                } else if (!validarEmail(email)) {
                    mostrarErrorCampo(inputEmail, 'Ingresa un correo electrónico válido.');
                } else {
                    marcarValido(inputEmail);
                }
            });

            // Validación en tiempo real de la contraseña
            inputPassword.addEventListener('blur', () => {
                const pass = inputPassword.value;
                if (pass === '') {
                    mostrarErrorCampo(inputPassword, 'La contraseña no puede estar vacía.');
                } else if (pass.length < 6) {
                    mostrarErrorCampo(inputPassword, 'La contraseña debe tener al menos 6 caracteres.');
                } else {
                    marcarValido(inputPassword);
                }
            });

            // Submit del formulario
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = inputEmail.value.trim();
                const pass = inputPassword.value;
                let hayError = false;

                // Validar email
                if (email === '') {
                    mostrarErrorCampo(inputEmail, 'El correo electrónico es obligatorio.');
                    hayError = true;
                } else if (!validarEmail(email)) {
                    mostrarErrorCampo(inputEmail, 'El formato del correo no es válido.');
                    hayError = true;
                } else {
                    marcarValido(inputEmail);
                }

                // Validar contraseña
                if (pass === '') {
                    mostrarErrorCampo(inputPassword, 'La contraseña es obligatoria.');
                    hayError = true;
                } else if (pass.length < 6) {
                    mostrarErrorCampo(inputPassword, 'Mínimo 6 caracteres para la contraseña.');
                    hayError = true;
                } else {
                    marcarValido(inputPassword);
                }

                if (hayError) return;

                // Simulación de inicio de sesión exitoso
                const recordarme = document.getElementById('recordarme').checked;
                Swal.fire({
                    icon: 'success',
                    title: '¡Inicio de sesión exitoso!',
                    html: `
                            <p style="margin:0;color:#4a3870;">Bienvenido <strong>${email}</strong></p>
                            <p style="margin:4px 0 0;font-size:0.85rem;color:#7a6f96;">
                                ${recordarme ? '✅ Te recordaremos en este dispositivo.' : 'Sesión temporal activada.'}
                            </p>
                        `,
                    confirmButtonColor: '#8b6fc0',
                    confirmButtonText: 'Continuar',
                    borderRadius: '20px',
                    customClass: {
                        popup: 'swal2-popup-moderno',
                        title: 'swal2-title-moderno',
                    },
                    didOpen: () => {
                        const popup = Swal.getPopup();
                        if (popup) {
                            popup.style.boxShadow = '0 25px 60px rgba(100,70,160,0.3)';
                        }
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        console.log('Redirigiendo al panel de notas...');
                        // window.location.href = '/panel-notas';
                    }
                });
            });

            // ==================== GOOGLE SIGN-IN ====================
            function inicializarGoogleSignIn() {
                if (typeof google === 'undefined' || !google.accounts) {
                    // Si la librería no cargó, mostrar mensaje al hacer clic
                    btnGoogle.addEventListener('click', () => {
                        Swal.fire({
                            icon: 'info',
                            title: 'Google Sign-In',
                            html: 'La librería de Google aún no se ha cargado.<br>Intenta de nuevo en unos segundos.',
                            confirmButtonColor: '#6c4fb8',
                            borderRadius: '20px',
                        });
                    });
                    return;
                }

                // Si hay un Client ID válido configurado
                if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com' &&
                    GOOGLE_CLIENT_ID.length > 20) {
                    google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleGoogleResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });

                    btnGoogle.addEventListener('click', () => {
                        google.accounts.id.prompt((notification) => {
                            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                                // Fallback: mostrar el diálogo de OAuth
                                google.accounts.id.renderButton(
                                    document.createElement('div'), { type: 'standard', theme: 'outline',
                                        size: 'large' }
                                );
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                });
                                document.querySelector('#credential_picker_container iframe')?.dispatchEvent(
                                    clickEvent);
                                // Alternativa: abrir directamente
                                Swal.fire({
                                    icon: 'info',
                                    title: 'Inicio con Google',
                                    html: 'Se abrirá la ventana de selección de cuenta de Google.',
                                    confirmButtonColor: '#6c4fb8',
                                    borderRadius: '20px',
                                }).then(() => {
                                    google.accounts.id.prompt();
                                });
                            }
                        });
                    });
                } else {
                    // Sin Client ID configurado: simulación demostrativa
                    btnGoogle.addEventListener('click', () => {
                        Swal.fire({
                            icon: 'info',
                            title: 'Google Sign-In (Demo)',
                            html: `
                                    <p style="color:#4a3870;">Para habilitar el inicio con Google real:</p>
                                    <ol style="text-align:left;color:#5e5578;font-size:0.88rem;margin-top:8px;">
                                        <li>Configura tu Client ID en Google Cloud Console</li>
                                        <li>Reemplaza <code>GOOGLE_CLIENT_ID</code> en el código</li>
                                        <li>Habilita el dominio en las credenciales</li>
                                    </ol>
                                    <p style="margin-top:10px;font-size:0.85rem;color:#8a7fa8;">
                                        🔹 Esta es una simulación. En producción, funcionará completamente.
                                    </p>
                                `,
                            confirmButtonColor: '#6c4fb8',
                            confirmButtonText: 'Entendido',
                            borderRadius: '20px',
                            customClass: {
                                popup: 'swal2-popup-moderno',
                            },
                        });
                    });
                }
            }

            function handleGoogleResponse(response) {
                // Decodificar el token JWT para obtener datos del usuario
                const payload = parseJwt(response.credential);
                if (payload) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Autenticado con Google!',
                        html: `
                                <p style="margin:0;color:#4a3870;">Bienvenido <strong>${payload.name || payload.email}</strong></p>
                                <p style="margin:4px 0 0;font-size:0.85rem;color:#7a6f96;">${payload.email}</p>
                            `,
                        confirmButtonColor: '#8b6fc0',
                        confirmButtonText: 'Ir al panel',
                        borderRadius: '20px',
                    }).then(() => {
                        console.log('Usuario Google:', payload);
                        // window.location.href = '/panel-notas';
                    });
                }
            }

            function parseJwt(token) {
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    ).join(''));
                    return JSON.parse(jsonPayload);
                } catch (e) {
                    return null;
                }
            }

            // Inicializar Google Sign-In cuando la librería esté lista
            if (typeof google !== 'undefined' && google.accounts) {
                inicializarGoogleSignIn();
            } else {
                window.addEventListener('load', () => {
                    setTimeout(inicializarGoogleSignIn, 1200);
                });
            }

            // ==================== LINKS ADICIONALES ====================
            linkOlvido.addEventListener('click', (e) => {
                e.preventDefault();
                Swal.fire({
                    icon: 'question',
                    title: 'Recuperar contraseña',
                    html: `
                            <p style="color:#4a3870;">Ingresa tu correo electrónico y te enviaremos
                            un enlace para restablecer tu contraseña.</p>
                            <input type="email" id="emailRecuperacion" placeholder="Ej: juan.perez@inatec.edu.ni"
                            style="width:100%;padding:12px;border-radius:12px;border:2px solid #e0d8f2;
                            margin-top:12px;font-size:0.9rem;text-align:center;">
                        `,
                    confirmButtonColor: '#8b6fc0',
                    confirmButtonText: 'Enviar enlace',
                    borderRadius: '20px',
                    preConfirm: () => {
                        const emailRec = document.getElementById('emailRecuperacion').value.trim();
                        if (!emailRec || !validarEmail(emailRec)) {
                            Swal.showValidationMessage('Ingresa un correo válido');
                            return false;
                        }
                        return emailRec;
                    },
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Enlace enviado',
                            text: `Se ha enviado un enlace a ${result.value} (simulación).`,
                            confirmButtonColor: '#6fc9a0',
                            borderRadius: '20px',
                        });
                    }
                });
            });

            linkAdmin.addEventListener('click', (e) => {
                e.preventDefault();
                Swal.fire({
                    icon: 'info',
                    title: 'Contactar al administrador',
                    html: `
                            <p style="color:#4a3870;">Para solicitar una cuenta, escribe a:</p>
                            <a href="mailto:admin@inatec.edu.ni" style="color:#6c4fb8;font-weight:700;
                            font-size:1.05rem;">admin@inatec.edu.ni</a>
                            <p style="margin-top:8px;font-size:0.8rem;color:#8a7fa8;">O llama al: +505 2222-3333</p>
                        `,
                    confirmButtonColor: '#6c4fb8',
                    confirmButtonText: 'Cerrar',
                    borderRadius: '20px',
                });
            });

            linkInicio.addEventListener('click', (e) => {
                e.preventDefault();
                Swal.fire({
                    icon: 'info',
                    title: 'Volver al Inicio',
                    text: 'Serás redirigido a la página principal.',
                    confirmButtonColor: '#6c4fb8',
                    confirmButtonText: 'Ir al inicio',
                    borderRadius: '20px',
                }).then(() => {
                    console.log('Redirigiendo a inicio...');
                    // window.location.href = '/';
                });
            });

            // ==================== ESTILOS ADICIONALES SWEETALERT ====================
            const estiloSweetAlert = document.createElement('style');
            estiloSweetAlert.textContent = `
                    .swal2-popup-moderno {
                        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;
                        padding: 2rem 1.8rem !important;
                    }
                    .swal2-title-moderno {
                        color: #4a3870 !important;
                        font-weight: 700 !important;
                        font-size: 1.4rem !important;
                    }
                    .swal2-confirm {
                        border-radius: 12px !important;
                        font-weight: 600 !important;
                        letter-spacing: 0.3px !important;
                        padding: 12px 28px !important;
                        transition: all 0.25s ease !important;
                    }
                    .swal2-confirm:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                    }
                `;
            document.head.appendChild(estiloSweetAlert);

            console.log('✅ Inicio de sesión mejorado listo.');
            console.log('🎨 Colores: morado y azul suaves');
            console.log('🫧 Burbujas animadas con toggle');
            console.log('🖱️ Efecto tilt al mover el mouse');
            console.log('🔐 Validación de email y contraseña con SweetAlert2');
            console.log('🔵 Botón Google Sign-In integrado');
        })();

        // inicios.js
document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");

    formLogin.addEventListener("submit", (e) => {
        e.preventDefault(); // Evita recargar la página

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // Validación básica
        if (!email || !password) {
            Swal.fire("Error", "Por favor completa todos los campos.", "error");
            return;
        }

        // Caso especial: Maestro
        if (email === "brusslyonpenalbarivas770@gmail.com") {
            Swal.fire({
                icon: "success",
                title: "Acceso Maestro",
                text: "Redirigiendo al panel de maestro...",
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "maestro.html";
            });

        // Caso especial: Administrador
        } else if (email === "jn468188@gmail.com") {
            Swal.fire({
                icon: "success",
                title: "Acceso Administrador",
                text: "Redirigiendo al panel de administrador...",
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "administrador.html";
            });

        // Caso general: Estudiante
        } else {
            Swal.fire({
                icon: "info",
                title: "Acceso Estudiante",
                text: "Redirigiendo al panel de estudiante...",
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "estudiante.html";
            });
        }
    });
});
