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
    6. LÓGICA DE GALERÍA (VISOR, AUTO-ALIMENTACIÓN Y PROTECCIÓN ANTI-ROBO)
    7. MOTOR DEL CARRUSEL (NAVEGACIÓN INTERACTIVA Y RESPONSIVE)
    8. BOTONES FLOTANTES (SCROLL TOP & WHATSAPP INTERACTION)
========================================================================
*/

/* --- 1. CONFIGURACIÓN INICIAL --- */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargamos el Menú y el Footer de forma independiente
    await cargarComponente('header-load', 'barra_inicio');
    await cargarComponente('footer-load', 'footer'); 
    
    // 2. Cargamos las secciones de forma secuencial para lograr el SCROLL INFINITO
    await cargarSeccionEnContenedor('section-inicio', 'inicio', true);
    await cargarSeccionEnContenedor('section-nosotros', 'nosotros', false);
    await cargarSeccionEnContenedor('section-oracion', 'pedidosdeoracion', false);
    await cargarSeccionEnContenedor('section-donaciones', 'donaciones', false);
    await cargarSeccionEnContenedor('section-galeria', 'gallery', false);
    
    console.log("Sistema TV45 Nicaragua: Scroll Infinito activo.");

    // --- INTEGRACIÓN: CONTROL POR TECLADO PARA MODO MAXIMIZADO ---
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('gallery-modal');
        if (modal && modal.style.display === "flex") {
            if (e.key === "ArrowRight") {
                changeLightboxImage(1);
            } else if (e.key === "ArrowLeft") {
                changeLightboxImage(-1);
            } else if (e.key === "Escape") {
                closeLightbox();
            }
        }
    });

    // FIX MÓVIL: Forzar re-cálculo de iFrame al rotar el teléfono
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const iframe = document.querySelector('.iframe-responsive-container iframe');
            if (iframe) {
                iframe.style.width = "100%";
            }
        }, 250);
    });
});


/* --- 2. MOTOR DE CARGA DINÁMICA --- */

async function cargarComponente(idContenedor, nombreArchivo) {
    const element = document.getElementById(idContenedor);
    if (!element) return;

    try {
        const response = await fetch(`sections/${nombreArchivo}.html`);
        if (!response.ok) throw new Error(`Error al cargar componente: ${nombreArchivo}`);
        const html = await response.text();
        element.innerHTML = html;
        
        if (nombreArchivo === 'footer') {
            const yearEl = document.getElementById('year');
            if (yearEl) {
                yearEl.textContent = new Date().getFullYear();
            }
        }

        verificarScroll(); 
    } catch (e) {
        console.error("Error en componentes:", e);
    }
}

async function cargarSeccionEnContenedor(idContenedor, nombreSeccion, esInicio) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    try {
        const response = await fetch(`sections/${nombreSeccion}.html`);
        if (!response.ok) throw new Error(`No existe la sección: ${nombreSeccion}`);

        const html = await response.text();
        contenedor.innerHTML = html;

        if (esInicio) {
            iniciarRelojLive();
            actualizarPrograma();
            setInterval(actualizarPrograma, 60000);
        }

        if (nombreSeccion === 'pedidosdeoracion') {
            await inicializarSelectorPaises();
        }

        if (nombreSeccion === 'gallery') {
            inicializarGaleriaInteractiva();
        }

    } catch (error) {
        console.error("Error en motor de carga de sección:", error);
        contenedor.innerHTML = `<div style="text-align:center; padding: 20px; color: white;">Error al cargar ${nombreSeccion}</div>`;
    }
}

async function inicializarSelectorPaises() {
    const selectPaises = document.getElementById('countrySelect');
    if (!selectPaises) return;

    try {
        const response = await fetch('script/paises.json');
        if (!response.ok) throw new Error('No se encontró script/paises.json');
        
        const paises = await response.json();
        paises.sort((a, b) => a.name.localeCompare(b.name));

        selectPaises.innerHTML = '<option value="" disabled selected>Selecciona tu país</option>';
        
        paises.forEach(pais => {
            const option = document.createElement('option');
            option.value = pais.name;
            option.textContent = `${pais.name} ${pais.flag}`;
            selectPaises.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando el JSON de países:", error);
    }
}

/* --- 3. FUNCIONES DE TIEMPO Y PROGRAMACIÓN (LIVE PLAYER) --- */

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

async function actualizarPrograma() {
    try {
        const response = await fetch('script/programacion.json');
        if (!response.ok) throw new Error("Error al leer script/programacion.json");
        const data = await response.json();
        
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
        console.warn("Sistema de programación no listo.");
    }
}


/* --- 4. UTILIDADES Y EVENTOS DE NAVEGACIÓN (SCROLL DINÁMICO) --- */

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

function verificarScroll() {
    const header = document.querySelector(".main-header");
    const scrollTopBtn = document.getElementById("scrollTopBtn");

    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }

    if (scrollTopBtn) {
        if (window.scrollY > 300) {
            scrollTopBtn.style.display = "flex";
        } else {
            scrollTopBtn.style.display = "none";
        }
    }
}

window.addEventListener("scroll", verificarScroll);


/* --- 5. LÓGICA DE FORMULARIO DE ORACIÓN (AJAX - ENVÍO SIN SALTAR) --- */

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
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                form.style.display = "none"; 
                status.style.display = "block"; 
                form.reset();
            } else {
                throw new Error("Error en servidor");
            }
        } catch (error) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-paper-plane"></i> REINTENTAR ENVÍO';
        }
    }
});


/* --- 6. LÓGICA DE GALERÍA (VISOR, AUTO-ALIMENTACIÓN Y PROTECCIÓN ANTI-ROBO) --- */

let listaImagenesGaleria = []; 
let currentModalIdx = 0;

// Nueva función de protección: Bloquea clic derecho y arrastre de imágenes
function protegerImagen(img) {
    img.addEventListener('contextmenu', (e) => e.preventDefault());
    img.addEventListener('dragstart', (e) => e.preventDefault());
}

async function inicializarGaleriaInteractiva() {
    const track = document.getElementById('gallery-track');
    if (!track) return;

    try {
        const response = await fetch('script/galeria.json');
        if (!response.ok) throw new Error("No se pudo cargar script/galeria.json");
        
        listaImagenesGaleria = await response.json();
        track.innerHTML = '';

        listaImagenesGaleria.forEach((foto, index) => {
            const card = document.createElement('div');
            card.className = 'gallery-item';
            card.onclick = () => openLightbox(index);
            
            card.innerHTML = `
                <div class="watermark-mini">
                    <img src="resources/tv45nicaragua.png" alt="TV45">
                </div>
                <img src="resources/img/${foto.archivo}" alt="${foto.titulo}" loading="lazy" class="gallery-img">
                <div class="gallery-info">
                    <span>${foto.titulo}</span>
                </div>
            `;
            
            // Protección activa para evitar descargas en miniaturas
            const img = card.querySelector('.gallery-img');
            protegerImagen(img);

            track.appendChild(card);
        });
    } catch (error) {
        console.error("Error en galería:", error);
    }
}

window.openLightbox = function(index) {
    const modal = document.getElementById('gallery-modal');
    if (!modal) return;

    currentModalIdx = index;
    updateModalContent();
    
    modal.style.display = "flex";
    document.body.style.overflow = "hidden"; 
};

window.closeLightbox = function() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.style.display = "none";
    }
    document.body.style.overflow = "auto";
};

window.changeLightboxImage = function(direction) {
    currentModalIdx = (currentModalIdx + direction + listaImagenesGaleria.length) % listaImagenesGaleria.length;
    updateModalContent();
};

function updateModalContent() {
    const wrapper = document.querySelector('.modal-image-wrapper');
    const caption = document.getElementById('modal-caption');
    const foto = listaImagenesGaleria[currentModalIdx];

    if (foto && wrapper) {
        wrapper.innerHTML = `
            <img id="modal-img" src="resources/img/${foto.archivo}" alt="${foto.titulo}" style="opacity: 0;">
            <div class="watermark-max animated-watermark">
                <img src="resources/tv45nicaragua.png" alt="TV45">
            </div>
        `;

        if (caption) caption.textContent = foto.titulo;

        const img = document.getElementById('modal-img');
        protegerImagen(img); // Protección activa en el visor maximizado

        img.onload = () => {
            img.style.transition = "opacity 0.5s ease-in-out";
            img.style.opacity = "1";
            
            const watermark = wrapper.querySelector('.watermark-max');
            if (watermark) {
                watermark.style.opacity = "0.6";
            }
        };
    }
}


/* --- 7. MOTOR DEL CARRUSEL (NAVEGACIÓN INTERACTIVA Y RESPONSIVE) --- */

let currentIdx = 0;
window.moveSlider = function(direction) {
    const track = document.getElementById('gallery-track');
    const items = document.querySelectorAll('.gallery-item');
    
    if (!track || items.length === 0) return;

    const itemsVisibles = window.innerWidth > 768 ? 3 : 1;
    const maxIdx = Math.max(0, items.length - itemsVisibles);

    currentIdx = currentIdx + direction;

    if (currentIdx < 0) currentIdx = 0;
    if (currentIdx > maxIdx) currentIdx = maxIdx;

    const gap = 15;
    const itemWidth = items[0].offsetWidth + gap;
    track.style.transform = `translateX(-${itemWidth * currentIdx}px)`;
};


/* --- 8. BOTONES FLOTANTES (SCROLL TOP & WHATSAPP INTERACTION) --- */

window.scrollToTop = function() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
};