let modal;

let personal = [];
let personalFiltrado = [];

//----------------------------------------
// INICIAR
//----------------------------------------

window.onload = function () {

    modal = new bootstrap.Modal(
        document.getElementById("modalDetalle")
    );

    cargarPersonal();

    document
        .getElementById("buscarPersonal")
        .addEventListener("keyup", filtrarPersonal);

};

//----------------------------------------
// CARGAR PERSONAL
//----------------------------------------

async function cargarPersonal() {

    const tbody = document.getElementById("tablaPersonal");

    tbody.innerHTML = `

    <tr>

        <td colspan="5" class="text-center">

            Cargando...

        </td>

    </tr>

    `;

    const snap = await window.db
        .ref("personal")
        .once("value");

    personal = [];

    if (!snap.exists()) {

        personalFiltrado = [];

        mostrarTablaPersonal();

        return;

    }

    const datos = snap.val();

    for (const key in datos) {

        const p = datos[key];

        personal.push({
            id: key,

            nombre: p.nombre,

            cedula: p.cedula,

            puesto: p.puesto || "",

            saldoVacaciones: p.saldoVacaciones

        });

    }

    personalFiltrado = [...personal];

    mostrarTablaPersonal();

}

//----------------------------------------
// MOSTRAR TABLA
//----------------------------------------

function mostrarTablaPersonal() {

    const tbody = document.getElementById("tablaPersonal");

    tbody.innerHTML = "";

    if (personalFiltrado.length === 0) {

        tbody.innerHTML = `

        <tr>

            <td colspan="5" class="text-center">

                No hay personal registrado

            </td>

        </tr>

        `;

        return;

    }

    personalFiltrado.forEach(p => {

        tbody.innerHTML += `

        <tr>

            <td>${p.nombre}</td>

            <td>${p.cedula}</td>

            <td>${p.puesto || "-"}</td>

            <td>${p.saldoVacaciones}</td>

            <td>

    <button
        class="btn btn-primary btn-sm mb-1"
        onclick="verDetalle('${p.id}')">

        Ver Detalle

    </button>

    <a
        href="registrarPersonal.html?id=${p.id}"
        class="btn btn-warning btn-sm mb-1">

        Editar

    </a>

    <button
        class="btn btn-danger btn-sm"
        onclick="eliminarPersonal('${p.id}')">

        Eliminar

    </button>

</td>

        </tr>

        `;

    });

}

//----------------------------------------
// FILTRAR POR NOMBRE O CÉDULA
//----------------------------------------

function filtrarPersonal() {

    const texto = document
        .getElementById("buscarPersonal")
        .value
        .toLowerCase()
        .trim();

    if (!texto) {

        personalFiltrado = [...personal];

    } else {

        personalFiltrado = personal.filter(p =>

            p.nombre.toLowerCase().includes(texto) ||
            p.cedula.toLowerCase().includes(texto)

        );

    }

    mostrarTablaPersonal();

}

//----------------------------------------
// VER DETALLE
//----------------------------------------

async function verDetalle(idPersona) {

    const snap = await window.db
        .ref("personal/" + idPersona)
        .once("value");

    const persona = snap.val();

    document.getElementById("dNombre").innerHTML =
        persona.nombre;

    document.getElementById("dCedula").innerHTML =
        persona.cedula;

    document.getElementById("dPuesto").innerHTML =
        persona.puesto || "-";

    document.getElementById("dCorreo").innerHTML =
        persona.correo || "-";

    document.getElementById("dTelefono").innerHTML =
        persona.telefono;

    document.getElementById("dDireccion").innerHTML =
        persona.direccion;

    document.getElementById("dIngreso").innerHTML =
        persona.fechaIngreso;

    document.getElementById("dSaldo").innerHTML =
        persona.saldoVacaciones + " días";

    document.getElementById("dBtnEditar").href =
        "registrarPersonal.html?id=" + idPersona;

    cargarVacaciones(idPersona);

    modal.show();

}

//----------------------------------------
// CARGAR VACACIONES
//----------------------------------------

async function cargarVacaciones(idPersona) {

    const tbody = document.getElementById("tablaVacaciones");

    tbody.innerHTML = "";

    const snap = await window.db
        .ref("vacaciones")
        .orderByChild("idPersona")
        .equalTo(idPersona)
        .once("value");

    if (!snap.exists()) {

        tbody.innerHTML = `

        <tr>

            <td colspan="3"
                class="text-center">

                No tiene vacaciones registradas

            </td>

        </tr>

        `;

        return;

    }

    const vacaciones = snap.val();

    for (const key in vacaciones) {

        const v = vacaciones[key];

        tbody.innerHTML += `

        <tr>

            <td>${v.fechaSalida}</td>

            <td>${v.fechaRegreso}</td>

            <td>${v.diasTomados}</td>

        </tr>

        `;

    }

}

//----------------------------------------
// ELIMINAR PERSONAL
//----------------------------------------

async function eliminarPersonal(idPersona){


    const confirmar = await Swal.fire({

        title:"¿Eliminar personal?",

        text:"También se eliminarán sus vacaciones registradas",

        icon:"warning",

        showCancelButton:true,

        confirmButtonText:"Sí, eliminar",

        cancelButtonText:"Cancelar"

    });



    if(!confirmar.isConfirmed){

        return;

    }



    try{


        // eliminar vacaciones asociadas

        const vacacionesSnap =
        await window.db
        .ref("vacaciones")
        .orderByChild("idPersona")
        .equalTo(idPersona)
        .once("value");



        if(vacacionesSnap.exists()){


            const vacaciones =
            vacacionesSnap.val();



            for(const id in vacaciones){


                await window.db
                .ref("vacaciones/"+id)
                .remove();


            }


        }




        // eliminar persona

        await window.db
        .ref("personal/"+idPersona)
        .remove();




        Swal.fire({

            icon:"success",

            title:"Eliminado",

            text:"El personal fue eliminado correctamente"

        });



        // quitarlo del arreglo sin recargar

        personal =
        personal.filter(p => p.id !== idPersona);

        personalFiltrado =
        personalFiltrado.filter(p => p.id !== idPersona);

        mostrarTablaPersonal();



    }
    catch(error){


        console.error(error);



        Swal.fire(

            "Error",

            "No se pudo eliminar el personal",

            "error"

        );


    }


}