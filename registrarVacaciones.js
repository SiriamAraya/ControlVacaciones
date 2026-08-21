let personas = [];
let personaSeleccionada = null;
let idPersonaSeleccionada = null;
let modal;


//-------------------------------------
// INICIO
//-------------------------------------

window.onload = function () {


    modal = new bootstrap.Modal(
        document.getElementById("modalDetalle")
    );


    cargarPersonas();



    $("#persona").select2({

        theme:"bootstrap-5",

        placeholder:"Buscar por nombre o cédula",

        allowClear:true

    });



    $("#persona").on("change",function(){


        const id=$(this).val();


        if(id){

            seleccionarPersona(id);

        }


    });



    const ahora = new Date();

    const hoy =
    ahora.getFullYear()+"-"+
    String(ahora.getMonth()+1).padStart(2,"0")+"-"+
    String(ahora.getDate()).padStart(2,"0");



    document.getElementById("fechaSalida").min = hoy;

    document.getElementById("fechaRegreso").min = hoy;



    document
    .getElementById("fechaSalida")
    .addEventListener("change",function(){


        document
        .getElementById("fechaRegreso")
        .min=this.value;


        calcularDias();


    });



    document
    .getElementById("fechaRegreso")
    .addEventListener("change",calcularDias);



    document
    .getElementById("btnRegistrar")
    .addEventListener("click",registrarVacaciones);


};



//-------------------------------------
// CARGAR PERSONAS EN COMBO
//-------------------------------------

async function cargarPersonas(){


    const snap = await window.db
    .ref("personal")
    .once("value");



    personas = [];



    if(!snap.exists())
        return;



    const datos = snap.val();



    for(const key in datos){


        personas.push({

            id:key,

            ...datos[key]

        });


    }



    const combo = $("#persona");



    personas.forEach(p=>{


        combo.append(`

            <option value="${p.id}">

                ${p.nombre} - ${p.cedula}

            </option>


        `);


    });



}




//-------------------------------------
// SELECCIONAR PERSONA
//-------------------------------------

function seleccionarPersona(id){


    idPersonaSeleccionada = id;



    personaSeleccionada = personas.find(
        p=>p.id == id
    );



    if(!personaSeleccionada)
        return;



    document
    .getElementById("saldo")
    .value = personaSeleccionada.saldoVacaciones + " días";


}




//-------------------------------------
// PARSEAR FECHA EN HORA LOCAL
// (evita el desfase de zona horaria
// de new Date("YYYY-MM-DD"))
//-------------------------------------

function parseFechaLocal(cadena){


    const partes = cadena.split("-");


    return new Date(
        Number(partes[0]),
        Number(partes[1])-1,
        Number(partes[2])
    );


}




//-------------------------------------
// CONTAR DIAS HABILES (sin sábados ni domingos)
//-------------------------------------

function contarDiasHabiles(fechaInicio, fechaFin){


    let contador = 0;


    const actual = new Date(fechaInicio);



    while(actual <= fechaFin){


        const diaSemana = actual.getDay();

        // 0 = domingo, 6 = sábado

        if(diaSemana !== 0 && diaSemana !== 6){

            contador++;

        }



        actual.setDate(actual.getDate()+1);


    }



    return contador;


}




//-------------------------------------
// CALCULAR DIAS
//-------------------------------------

function calcularDias(){


    const salida =
    document.getElementById("fechaSalida").value;


    const regreso =
    document.getElementById("fechaRegreso").value;



    if(!salida || !regreso){

        document.getElementById("dias").value="";

        return;

    }



    const fechaSalida = parseFechaLocal(salida);

    const fechaRegreso = parseFechaLocal(regreso);



    if(fechaRegreso < fechaSalida){


        document.getElementById("dias").value="";


        Swal.fire(
            "Error",
            "La fecha de regreso no puede ser menor a la salida",
            "error"
        );


        return;

    }



    const dias = contarDiasHabiles(

        fechaSalida,

        fechaRegreso

    );



    document.getElementById("dias").value=dias;



    // VALIDAR SALDO


    if(personaSeleccionada){


        const saldo = 
        Number(personaSeleccionada.saldoVacaciones);



        if(dias > saldo){


            Swal.fire({

                icon:"warning",

                title:"Días insuficientes",

                text:
                `La persona solo tiene ${saldo} días disponibles`

            });



            document.getElementById("dias").value="";

        }


    }


}





//-------------------------------------
// VER DETALLE
//-------------------------------------

async function verDetalle(){

    if(!personaSeleccionada){
        Swal.fire(
            "Seleccione una persona",
            "Debe elegir una persona primero",
            "warning"
        );
        return;
    }

    document.getElementById("detallePersona")
    .innerHTML = `

    <p>
        <b>Nombre:</b>
        ${personaSeleccionada.nombre}
    </p>

    <p>
        <b>Cédula:</b>
        ${personaSeleccionada.cedula}
    </p>

    <p>
        <b>Puesto:</b>
        ${personaSeleccionada.puesto || "-"}
    </p>

    <p>
        <b>Correo:</b>
        ${personaSeleccionada.correo || "-"}
    </p>

    <p>
        <b>Teléfono:</b>
        ${personaSeleccionada.telefono}
    </p>

    <p>
        <b>Dirección:</b>
        ${personaSeleccionada.direccion}
    </p>

    <p>
        <b>Fecha ingreso:</b>
        ${personaSeleccionada.fechaIngreso}
    </p>

    <p>
        <b>Vacaciones disponibles:</b>
        ${personaSeleccionada.saldoVacaciones} días
    </p>

    `;

    await cargarHistorial();

    modal.show();
}




//-------------------------------------
// CARGAR HISTORIAL
//-------------------------------------

async function cargarHistorial(){


    const tbody =
    document.getElementById("historialVacaciones");



    tbody.innerHTML="";



    const snap = await window.db
    .ref("vacaciones")
    .orderByChild("idPersona")
    .equalTo(idPersonaSeleccionada)
    .once("value");



    if(!snap.exists()){


        tbody.innerHTML=`

        <tr>

            <td colspan="3" class="text-center">

                Sin vacaciones registradas

            </td>

        </tr>

        `;


        return;

    }




    const datos=snap.val();



    for(const key in datos){


        const v=datos[key];



        tbody.innerHTML += `


        <tr>

            <td>${v.fechaSalida}</td>

            <td>${v.fechaRegreso}</td>

            <td>${v.diasTomados}</td>


        </tr>


        `;


    }



}




//-------------------------------------
// REGISTRAR VACACIONES
//-------------------------------------

async function registrarVacaciones(){



    if(!personaSeleccionada){


        Swal.fire(
            "Error",
            "Seleccione una persona",
            "warning"
        );


        return;

    }



    const fechaSalida =
    document.getElementById("fechaSalida").value;



    const fechaRegreso =
    document.getElementById("fechaRegreso").value;



    const dias =
    parseInt(document.getElementById("dias").value);



    if(!fechaSalida || !fechaRegreso || !dias){


    Swal.fire(
        "Error",
        "Complete las fechas de vacaciones",
        "warning"
    );


    return;

}



// VALIDAR QUE NO TENGA VACACIONES EN ESAS FECHAS

const fechasDisponibles =
await validarVacacionesExistentes(
    idPersonaSeleccionada,
    fechaSalida,
    fechaRegreso
);



if(!fechasDisponibles){

    return;

}




    const saldoActual =
    parseInt(personaSeleccionada.saldoVacaciones);



    if(dias > saldoActual){


        Swal.fire(
            "Error",
            "No tiene suficientes días de vacaciones",
            "error"
        );


        return;

    }




    const nuevoSaldo =
    saldoActual - dias;



    // actualizar saldo persona

    await window.db
    .ref("personal/"+idPersonaSeleccionada)
    .update({

        saldoVacaciones:nuevoSaldo

    });





    // guardar vacaciones

    await window.db
    .ref("vacaciones")
    .push({


        idPersona:idPersonaSeleccionada,

        nombre:personaSeleccionada.nombre,

        fechaSalida,

        fechaRegreso,

        diasTomados:dias,

        fechaRegistro:new Date().toISOString()


    });





    Swal.fire({

        icon:"success",

        title:"Vacaciones registradas",

        text:
        "Se descontaron "+dias+" días correctamente"

    });




    personaSeleccionada.saldoVacaciones =
    nuevoSaldo;



    document
    .getElementById("saldo")
    .value =
    nuevoSaldo+" días";



    document
    .getElementById("fechaSalida")
    .value="";


    document
    .getElementById("fechaRegreso")
    .value="";


    document
    .getElementById("dias")
    .value="";


}

//-------------------------------------
// VALIDAR VACACIONES EXISTENTES
//-------------------------------------

async function validarVacacionesExistentes(
    idPersona,
    nuevaSalida,
    nuevoRegreso
){


    const snap =
    await window.db
    .ref("vacaciones")
    .orderByChild("idPersona")
    .equalTo(idPersona)
    .once("value");



    if(!snap.exists()){

        return true;

    }



    const datos = snap.val();



    const nuevaSalidaFecha =
    parseFechaLocal(nuevaSalida);



    const nuevoRegresoFecha =
    parseFechaLocal(nuevoRegreso);



    for(const id in datos){


        const vacacion = datos[id];



        const salidaExistente =
        parseFechaLocal(vacacion.fechaSalida);



        const regresoExistente =
        parseFechaLocal(vacacion.fechaRegreso);




        /*
        Verifica si las fechas se cruzan

        Ejemplo:
        Existente:
        28/07/2026 - 30/07/2026

        Nueva:
        30/07/2026 - 02/08/2026

        Bloquea porque comparten el día 30
        */


        if(

            nuevaSalidaFecha <= regresoExistente

            &&

            nuevoRegresoFecha >= salidaExistente

        ){



            Swal.fire({

                icon:"error",

                title:"Fecha no disponible",

                text:
                "Esta persona ya tiene vacaciones registradas en esas fechas"

            });



            return false;


        }


    }



    return true;


}