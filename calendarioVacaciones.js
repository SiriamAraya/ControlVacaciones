let calendario = null;

// Paleta fija: un color consistente por persona (se asigna por índice, no al azar,
// para que cada quien conserve siempre el mismo color entre recargas)
const PALETA_PERSONAS = [
    { bg: "#1B4372", text: "#ffffff" }, // azul (ink-2)
    { bg: "#C68526", text: "#ffffff" }, // ámbar oscuro
    { bg: "#2E9E6C", text: "#ffffff" }, // verde
    { bg: "#8E44AD", text: "#ffffff" }, // morado
    { bg: "#D5504A", text: "#ffffff" }, // rojo/coral
    { bg: "#1D8A99", text: "#ffffff" }, // teal
    { bg: "#B75FA6", text: "#ffffff" }, // rosado
    { bg: "#5B6ABF", text: "#ffffff" }, // índigo
    { bg: "#A6763A", text: "#ffffff" }, // marrón
    { bg: "#4A7A3D", text: "#ffffff" }, // verde oliva
];

// idPersona -> color asignado (se llena en cargarDatos)
const coloresPorPersona = {};


//--------------------------------
// INICIO
//--------------------------------

window.onload = function () {
    cargarDatos();
};


//--------------------------------
// CARGAR DATOS DESDE FIREBASE
//--------------------------------

async function cargarDatos() {

    mostrarCargando(true);

    try {

        const [vacacionesSnap, personalSnap] = await Promise.all([
            window.db.ref("vacaciones").once("value"),
            window.db.ref("personal").once("value"),
        ]);

        const personalData = personalSnap.val() || {};
        const vacacionesData = vacacionesSnap.val() || {};

        const eventos = [];
        const personasConVacaciones = new Map();

        let indiceColor = 0;

        for (const id in vacacionesData) {

            const v = vacacionesData[id];
            const persona = personalData[v.idPersona];

            if (!persona || !v.fechaSalida || !v.fechaRegreso) continue;

            // Asignar color consistente por persona (una sola vez por idPersona)
            if (!coloresPorPersona[v.idPersona]) {
                coloresPorPersona[v.idPersona] =
                    PALETA_PERSONAS[indiceColor % PALETA_PERSONAS.length];
                indiceColor++;
            }

            const color = coloresPorPersona[v.idPersona];

            if (!personasConVacaciones.has(v.idPersona)) {
                personasConVacaciones.set(v.idPersona, {
                    nombre: persona.nombre,
                    color: color.bg,
                });
            }

            eventos.push({
                id: id,
                title: persona.nombre,
                start: v.fechaSalida,
                // FullCalendar trata "end" como exclusivo en eventos de todo el día,
                // por eso se suma un día para que el último día sí se pinte
                end: sumarUnDia(v.fechaRegreso),
                allDay: true,
                backgroundColor: color.bg,
                borderColor: color.bg,
                textColor: color.text,
                extendedProps: {
                    idPersona: v.idPersona,
                    nombre: persona.nombre,
                    cedula: persona.cedula || "-",
                    puesto: persona.puesto || "-",
                    fechaIngreso: persona.fechaIngreso || "",
                    saldoVacaciones: persona.saldoVacaciones,
                    fechaSalida: v.fechaSalida,
                    fechaRegreso: v.fechaRegreso,
                    diasTomados: v.diasTomados,
                    correlativo: v.correlativo || null,
                },
            });

        }

        construirLeyenda(personasConVacaciones);
        inicializarCalendario(eventos);

    } catch (error) {

        console.error(error);

        document.getElementById("leyendaPersonas").innerHTML =
            `<span class="leyenda-vacio text-danger">No se pudieron cargar los datos.</span>`;

    } finally {

        mostrarCargando(false);

    }

}


//--------------------------------
// LEYENDA DE PERSONAS
//--------------------------------

function construirLeyenda(personasConVacaciones) {

    const contenedor = document.getElementById("leyendaPersonas");

    if (personasConVacaciones.size === 0) {
        contenedor.innerHTML =
            `<span class="leyenda-vacio">No hay vacaciones registradas todavía.</span>`;
        return;
    }

    let html = "";

    personasConVacaciones.forEach(p => {
        html += `
            <span class="leyenda-item">
                <span class="leyenda-punto" style="background:${p.color}"></span>
                ${p.nombre}
            </span>
        `;
    });

    contenedor.innerHTML = html;

}


//--------------------------------
// CALENDARIO (FullCalendar)
//--------------------------------

function inicializarCalendario(eventos) {

    const el = document.getElementById("calendario");

    if (calendario) {
        calendario.destroy();
    }

    calendario = new FullCalendar.Calendar(el, {

        initialView: "dayGridMonth",
        locale: "es",
        height: "auto",
        firstDay: 1,
        dayMaxEvents: 3,
        eventDisplay: "block",
        allDayText: "",

        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
        },

        buttonText: {
            today: "Hoy",
            month: "Mes",
            week: "Semana",
        },

        events: eventos,

        eventClick: function (info) {
            mostrarDetallePersona(info.event.extendedProps);
        },

    });

    calendario.render();

}


//--------------------------------
// DETALLE DE LA PERSONA (click en evento)
//--------------------------------

function mostrarDetallePersona(props) {

    const diasRestantes =
        props.saldoVacaciones !== undefined && props.saldoVacaciones !== null
            ? props.saldoVacaciones
            : "-";

    Swal.fire({

        title: props.nombre,

        html: `
            <div class="detalle-persona">

                <div class="fila">
                    <span class="etiqueta">Cédula</span>
                    <span class="valor">${props.cedula}</span>
                </div>

                <div class="fila">
                    <span class="etiqueta">Puesto</span>
                    <span class="valor">${props.puesto}</span>
                </div>

                <div class="fila">
                    <span class="etiqueta">Fecha de ingreso</span>
                    <span class="valor">${formatearFechaSimple(props.fechaIngreso)}</span>
                </div>

                <div class="fila">
                    <span class="etiqueta">Del</span>
                    <span class="valor">${formatearFechaSimple(props.fechaSalida)}</span>
                </div>

                <div class="fila">
                    <span class="etiqueta">Al</span>
                    <span class="valor">${formatearFechaSimple(props.fechaRegreso)}</span>
                </div>

                <div class="fila">
                    <span class="etiqueta">Días tomados</span>
                    <span class="valor">${props.diasTomados ?? "-"}</span>
                </div>

                <div class="fila">
                    <span class="etiqueta">Días restantes</span>
                    <span class="valor" style="color:var(--success)">${diasRestantes}</span>
                </div>

            </div>
        `,

        showCancelButton: true,
        confirmButtonText: "Ver en listado",
        cancelButtonText: "Cerrar",
        confirmButtonColor: "#122B4D",
        cancelButtonColor: "#66738D",
        width: 420,

    }).then(resultado => {

        if (resultado.isConfirmed) {
            // Lleva al listado general con la persona ya escrita en el buscador
            window.location.href =
                "vacaciones.html?buscar=" + encodeURIComponent(props.nombre);
        }

    });

}


//--------------------------------
// AYUDAS
//--------------------------------

function mostrarCargando(mostrar) {
    const shade = document.getElementById("loadingShade");
    if (!shade) return;
    shade.style.display = mostrar ? "flex" : "none";
}

// Suma un día a una fecha "YYYY-MM-DD" (para el "end" exclusivo de FullCalendar)
function sumarUnDia(fechaTexto) {
    const fecha = new Date(fechaTexto + "T00:00:00");
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toISOString().split("T")[0];
}

// Formatea "YYYY-MM-DD" a "dd/mm/aaaa"
function formatearFechaSimple(fechaTexto) {
    if (!fechaTexto) return "-";
    const soloFecha = fechaTexto.split("T")[0];
    const [anio, mes, dia] = soloFecha.split("-");
    if (!anio || !mes || !dia) return fechaTexto;
    return `${dia}/${mes}/${anio}`;
}