/* ========================================================================
   PROYECTO: TV45 Nicaragua
   ARCHIVO: script.js
   DESCRIPCIÓN: Gestión de carga dinámica y funciones interactivas.
========================================================================
   ÍNDICE:
   1. CONFIGURACIÓN INICIAL (DOMContentLoaded)
   2. MOTOR DE CARGA DINÁMICA (Componentes y Secciones)
   3. FUNCIONES DE TIEMPO Y PROGRAMACIÓN (LIVE PLAYER)
   4. UTILIDADES Y EVENTOS DE NAVEGACIÓN (SCROLL DINÁMICO)
   5. LÓGICA DE FORMULARIO DE ORACIÓN (AJAX - ENVÍO SIN SALTAR)
========================================================================
*/

/* --- 1. CONFIGURACIÓN INICIAL --- */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargamos el Menú de forma independiente
    await cargarComponente('header-load', 'barra_inicio');
    
    // 2. Cargamos las secciones de forma secuencial para lograr el SCROLL INFINITO
    
    // Punto 1: Inicio (Reproductor y Programación)
    await cargarSeccionEnContenedor('section-inicio', 'inicio', true);
    
    // Punto 2: "Nosotros" (Carga dinámica)
    await cargarSeccionEnContenedor('section-nosotros', 'nosotros', false);

    // Punto 3: "Pedidos de Oración" (Nueva sección integrada)
    await cargarSeccionEnContenedor('section-oracion', 'pedidosdeoracion', false);

    // Punto 4: "Donaciones" (Integración Estilo Clean White)
    await cargarSeccionEnContenedor('section-donaciones', 'donaciones', false);
    
    console.log("Sistema TV45 Nicaragua: Scroll Infinito (Inicio, Nosotros, Oración, Donaciones) activo.");

    // FIX MÓVIL: Forzar re-cálculo de iFrame al rotar el teléfono o redimensionar
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const iframe = document.querySelector('.iframe-responsive-container iframe');
            if (iframe) {
                // Forzamos un refresco visual del ancho para asegurar que el video no se detenga
                iframe.style.width = "100%";
                console.info("Ajuste de reproductor aplicado por redimensionamiento.");
            }
        }, 250);
    });
});


/* --- 2. MOTOR DE CARGA DINÁMICA --- */

/**
 * Función para cargar componentes fijos (Header, Footer)
 */
async function cargarComponente(idContenedor, nombreArchivo) {
    const element = document.getElementById(idContenedor);
    if (!element) return;

    try {
        const response = await fetch(`sections/${nombreArchivo}.html`);
        if (!response.ok) throw new Error(`Error: ${nombreArchivo}`);
        const html = await response.text();
        element.innerHTML = html;
        
        verificarScroll(); 
    } catch (e) {
        console.error("Error en componentes:", e);
    }
}

/**
 * NUEVA FUNCIÓN: Carga secciones en contenedores específicos sin borrar los demás
 */
async function cargarSeccionEnContenedor(idContenedor, nombreSeccion, esInicio) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    try {
        const response = await fetch(`sections/${nombreSeccion}.html`);
        if (!response.ok) throw new Error(`No existe: ${nombreSeccion}`);

        const html = await response.text();
        contenedor.innerHTML = html;

        // LOGICA ESPECÍFICA POR SECCIÓN
        if (esInicio) {
            iniciarRelojLive();
            actualizarPrograma();
            // Actualización automática cada minuto para el cambio de programa
            setInterval(actualizarPrograma, 60000);
            console.info("Punto 1: Inicio y Reproductor sincronizados.");
        }

        if (nombreSeccion === 'nosotros') {
            console.info("Punto 2: Sección 'Nosotros' integrada correctamente.");
        }

        if (nombreSeccion === 'pedidosdeoracion') {
            // INTEGRACIÓN: Cargar países y habilitar búsqueda por teclado
            await inicializarSelectorPaises();
            console.info("Punto 3: Sección 'Pedidos de Oración' y búsqueda de países activada.");
        }

        if (nombreSeccion === 'donaciones') {
            console.info("Punto 4: Sección 'Donaciones' (Clean White) cargada exitosamente.");
        }

    } catch (error) {
        console.error("Error en carga de sección:", error);
        contenedor.innerHTML = `<div style="text-align:center; padding: 20px; color: white;">Error al cargar ${nombreSeccion}</div>`;
    }
}

/**
 * FUNCIÓN DE APOYO: Carga el JSON de países y permite búsqueda rápida por teclado
 */
async function inicializarSelectorPaises() {
    const selectPaises = document.getElementById('countrySelect');
    if (!selectPaises) return;

    try {
        const response = await fetch('script/paises.json');
        if (!response.ok) throw new Error('No se encontró script/paises.json');
        
        const paises = await response.json();
        
        // Ordenamos alfabéticamente para que el salto por teclado sea coherente
        paises.sort((a, b) => a.name.localeCompare(b.name));

        // Limpiamos y llenamos
        selectPaises.innerHTML = '<option value="" disabled selected>Selecciona tu país</option>';
        
        paises.forEach(pais => {
            const option = document.createElement('option');
            option.value = pais.name;
            // IMPORTANTE: El nombre va primero para que el navegador lo detecte al teclear
            option.textContent = `${pais.name} ${pais.flag}`;
            selectPaises.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando el JSON de países:", error);
        selectPaises.innerHTML = '<option value="">Error al cargar países</option>';
    }
}

/* --- 3. FUNCIONES DE TIEMPO Y PROGRAMACIÓN (LIVE PLAYER) --- */

/**
 * Inicia el reloj sincronizado con la hora de Nicaragua (sin segundos)
 */
function iniciarRelojLive() {
    const actualizarReloj = () => {
        const reloj = document.getElementById('live-clock');
        if (reloj) {
            const ahora = new Date();
            reloj.textContent = ahora.toLocaleTimeString('es-NI', {
                timeZone: 'America/Managua',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    };
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
}

/**
 * Motor de programación: Carga 'programacion.json' y determina el programa en vivo 
 */
async function actualizarPrograma() {
    try {
        const response = await fetch('script/programacion.json');
        if (!response.ok) throw new Error("Error al leer script/programacion.json");
        const data = await response.json();
        
        // Obtenemos hora actual en formato HH:mm para comparar
        const ahoraEnNicaragua = new Intl.DateTimeFormat('es-NI', {
            timeZone: 'America/Managua',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(new Date());

        const ahora = new Date();
        const diaSemana = ahora.getDay(); 

        let bloqueHoy;
        if (diaSemana === 5) bloqueHoy = data.viernes;
        else if (diaSemana === 6) bloqueHoy = data.sabado;
        else bloqueHoy = data.semana;

        let programaEnVivo = "TV45 Nicaragua";
        let programaSiguiente = "Programación Regular";

        if (bloqueHoy && bloqueHoy.length > 0) {
            for (let i = 0; i < bloqueHoy.length; i++) {
                const prog = bloqueHoy[i];
                const sigProg = bloqueHoy[i + 1] || bloqueHoy[0];

                if (ahoraEnNicaragua >= prog.hora) {
                    if (i === bloqueHoy.length - 1 || ahoraEnNicaragua < sigProg.hora) {
                        programaEnVivo = prog.titulo;
                        programaSiguiente = `${sigProg.titulo} (${sigProg.hora})`;
                        break;
                    }
                }
            }
        }

        const elVivo = document.getElementById('current-program');
        const elSig = document.getElementById('next-program');
        
        if (elVivo) elVivo.textContent = programaEnVivo;
        if (elSig) elSig.textContent = programaSiguiente;

    } catch (e) {
        console.warn("Sistema de programación: Los elementos de UI aún no están listos.");
    }
}


/* --- 4. UTILIDADES Y EVENTOS DE NAVEGACIÓN --- */

/**
 * Función para el Menú: Desplazamiento suave (Scroll Suave) hacia las secciones
 */
function irA(idDestino) {
    const elemento = document.getElementById(idDestino);
    if (elemento) {
        const headerOffset = 80; 
        const elementPosition = elemento.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
}

/**
 * Controla la transparencia y tamaño del header al hacer scroll
 */
function verificarScroll() {
    const header = document.querySelector(".main-header");
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }
}

window.addEventListener("scroll", verificarScroll);


/* --- 5. LÓGICA DE FORMULARIO DE ORACIÓN (AJAX) --- */

/**
 * Intercepta el envío del formulario para procesarlo sin recargar la página
 */
document.addEventListener("submit", async (e) => {
    if (e.target && e.target.id === "prayerForm") {
        e.preventDefault();
        
        const form = e.target;
        const status = document.getElementById("form-status");
        const button = document.getElementById("submitBtn");
        const data = new FormData(form);

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ENVIANDO...';

        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                form.style.display = "none"; 
                status.style.display = "block"; 
                form.reset();
            } else {
                throw new Error("Error en la respuesta del servidor");
            }
        } catch (error) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-paper-plane"></i> REINTENTAR ENVÍO';
            alert("Hubo un problema de conexión. Por favor, verifica tu internet e intenta de nuevo.");
        }
    }
});