let vacaciones = [];
let vacacionesFiltradas = [];


//--------------------------------
// INICIO
//--------------------------------

window.onload = function(){


    cargarVacaciones();


    document
    .getElementById("buscar")
    .addEventListener("keyup",filtrar);


    document
    .getElementById("fechaDesde")
    .addEventListener("change",filtrar);


    document
    .getElementById("fechaHasta")
    .addEventListener("change",filtrar);


};





//--------------------------------
// CARGAR DATOS
//--------------------------------

async function cargarVacaciones(){


    const tbody =
    document.getElementById("listaVacaciones");


    tbody.innerHTML=`

    <tr>
        <td colspan="8" class="text-center">
            Cargando...
        </td>
    </tr>

    `;



    const snap =
    await window.db
    .ref("vacaciones")
    .once("value");



    vacaciones=[];



    if(!snap.exists()){

        vacacionesFiltradas=[];

        mostrarTabla();

        return;

    }




    const datos=snap.val();




    for(const id in datos){


        const v=datos[id];



        const personaSnap =
        await window.db
        .ref("personal/"+v.idPersona)
        .once("value");



        const persona =
        personaSnap.val();



        if(persona){


            vacaciones.push({

                id:id,

                idPersona:v.idPersona,

                nombre:persona.nombre,

                cedula:persona.cedula,

                puesto:persona.puesto || "",

                fechaIngreso:persona.fechaIngreso || "",

                fechaSalida:v.fechaSalida,

                fechaRegreso:v.fechaRegreso,

                diasTomados:v.diasTomados,

                diasRestantes:persona.saldoVacaciones,

                fechaRegistro:v.fechaRegistro,

                correlativo:v.correlativo || null

            });


        }


    }




    // NUEVAS ARRIBA

    vacaciones.sort((a,b)=>{

        return new Date(b.fechaRegistro)
        -
        new Date(a.fechaRegistro);

    });




    vacacionesFiltradas=[...vacaciones];


    mostrarTabla();


}








//--------------------------------
// MOSTRAR TABLA
//--------------------------------

function mostrarTabla(){


const tbody =
document.getElementById("listaVacaciones");


tbody.innerHTML="";



if(vacacionesFiltradas.length===0){


tbody.innerHTML=`

<tr>

<td colspan="8" class="text-center">

No hay vacaciones registradas

</td>

</tr>

`;

return;

}




vacacionesFiltradas.forEach(v=>{


tbody.innerHTML += `


<tr>

<td>
${v.nombre}
</td>


<td>
${v.cedula}
</td>


<td>
${formatearFecha(v.fechaSalida)}
</td>


<td>
${formatearFecha(v.fechaRegreso)}
</td>


<td class="text-center">

${v.diasTomados}

</td>


<td class="text-center text-success fw-bold">

${v.diasRestantes}

</td>


<td>

${formatearFecha(
v.fechaRegistro ?
v.fechaRegistro.split("T")[0]
:
""
)}

</td>


<td>


<button

class="btn btn-success btn-sm mb-1"

onclick="generarBoleta('${v.id}')">

📄 Boleta

</button>



<button

class="btn btn-danger btn-sm"

onclick="eliminarVacacion(
'${v.id}',
'${v.idPersona}',
${v.diasTomados}
)">

Eliminar

</button>


</td>


</tr>


`;


});


}








//--------------------------------
// FILTROS
//--------------------------------

function filtrar(){


let texto =
document
.getElementById("buscar")
.value
.toLowerCase()
.trim();



let desde =
document.getElementById("fechaDesde")
.value;



let hasta =
document.getElementById("fechaHasta")
.value;




vacacionesFiltradas = vacaciones.filter(v=>{


let cumpleTexto=true;

let cumpleFecha=true;




if(texto){


cumpleTexto =

v.nombre.toLowerCase()
.includes(texto)

||

v.cedula.includes(texto);


}





if(desde){


cumpleFecha =
v.fechaSalida >= desde;


}





if(hasta){


cumpleFecha =
cumpleFecha &&
v.fechaSalida <= hasta;


}





return cumpleTexto && cumpleFecha;


});



mostrarTabla();


}








//--------------------------------
// ELIMINAR
//--------------------------------

async function eliminarVacacion(id,idPersona,dias){



const confirmar = await Swal.fire({


title:"¿Eliminar vacaciones?",

text:"Los días serán devueltos al saldo disponible",

icon:"warning",

showCancelButton:true,

confirmButtonText:"Sí, eliminar",

cancelButtonText:"Cancelar"


});




if(!confirmar.isConfirmed)
return;





try{


// buscar persona

const personaSnap =
await window.db
.ref("personal/"+idPersona)
.once("value");



const persona =
personaSnap.val();




if(!persona){


Swal.fire(
"Error",
"No existe la persona",
"error"
);


return;

}




let saldoActual =
parseInt(persona.saldoVacaciones || 0);



let nuevoSaldo =
saldoActual + parseInt(dias);






// devolver días

await window.db
.ref("personal/"+idPersona)
.update({

saldoVacaciones:nuevoSaldo

});






// eliminar registro

await window.db
.ref("vacaciones/"+id)
.remove();






Swal.fire({

icon:"success",

title:"Eliminado",

text:"Los días fueron devueltos correctamente"

});






// quitarlo del arreglo sin recargar

vacaciones =
vacaciones.filter(v=>v.id!==id);



vacacionesFiltradas =
vacacionesFiltradas.filter(v=>v.id!==id);



mostrarTabla();





}
catch(error){


console.error(error);


Swal.fire(

"Error",

"No se pudo eliminar la vacación",

"error"

);


}



}









//--------------------------------
// FORMATO FECHA
//--------------------------------

function formatearFecha(fecha){


if(!fecha)
return "";



let partes =
fecha.split("-");



if(partes.length!==3)
return fecha;



return `${partes[2]}/${partes[1]}/${partes[0]}`;


}








//--------------------------------
// SUMAR UN DÍA A UNA FECHA
//--------------------------------

function sumarUnDia(fecha){


if(!fecha)
return "";



let partes =
fecha.split("-");



if(partes.length!==3)
return fecha;



let d = new Date(
Number(partes[0]),
Number(partes[1])-1,
Number(partes[2])
);


d.setDate(d.getDate()+1);


let anio = d.getFullYear();

let mes = String(d.getMonth()+1).padStart(2,"0");

let dia = String(d.getDate()).padStart(2,"0");


return `${anio}-${mes}-${dia}`;


}




//--------------------------------
// CONSECUTIVO DE BOLETAS (BV-NN-AAAA)
//
// Se guarda en Firebase bajo consecutivos/boletas/{anio}
// El año 2026 arranca en 9 (para continuar la numeración
// manual previa BV-01 a BV-08). Cualquier otro año arranca
// en 1 y se reinicia automáticamente al cambiar el año.
//--------------------------------

async function obtenerSiguienteConsecutivo(anio){

    const ref =
    window.db.ref("consecutivos/boletas/"+anio);

    const snap =
    await ref.once("value");

    let siguiente;

    if(snap.exists()){

        siguiente = parseInt(snap.val()) + 1;

    }else{

        siguiente = (anio === 2026) ? 9 : 1;

    }

    await ref.set(siguiente);

    return siguiente;

}




//--------------------------------
// OBTENER (O CREAR) EL CORRELATIVO
// DE UNA VACACIÓN ESPECÍFICA
//--------------------------------

async function obtenerCorrelativoBoleta(vacacion){

    if(vacacion.correlativo){

        return vacacion.correlativo;

    }

    const anio = new Date().getFullYear();

    const numero =
    await obtenerSiguienteConsecutivo(anio);

    const correlativo =
    "BV-" + String(numero).padStart(2,"0") + "-" + anio;

    await window.db
    .ref("vacaciones/"+vacacion.id)
    .update({ correlativo });

    vacacion.correlativo = correlativo;

    return correlativo;

}




//--------------------------------
// PDF LISTADO
//--------------------------------

function generarPDF(){


const {jsPDF}=window.jspdf;


const doc=new jsPDF();


// Coloca aquí la ruta de tu logo
const logo = "assets/logo.jpg";


const imgReady = new Image();

imgReady.crossOrigin = "anonymous";

imgReady.src = logo;


imgReady.onload = function(){

    crearContenidoListado(doc, imgReady);

};


imgReady.onerror = function(){

    crearContenidoListado(doc, null);

};


}




//--------------------------------
// CONTENIDO LISTADO
//--------------------------------

function crearContenidoListado(doc, logoImg){


const anchoPagina = doc.internal.pageSize.getWidth();
const margen = 14;


// Encabezado con franja de color
doc.setFillColor(21, 61, 107);
doc.rect(0, 0, anchoPagina, 28, "F");


if(logoImg){

    try{

        doc.addImage(logoImg, "PNG", margen, 4, 18, 18);

    }catch(e){}

}


const xTitulo = logoImg ? margen + 24 : margen;


doc.setTextColor(255,255,255);
doc.setFont("helvetica","bold");
doc.setFontSize(9);
doc.text(
"Asociación Administradora del Acueducto y Alcantarillado",
xTitulo,
9
);
doc.text(
"Sanitario de los Ángeles de Grecia",
xTitulo,
13.5
);


doc.setFontSize(14);
doc.text(
"Listado de Vacaciones",
xTitulo,
22
);

doc.setFont("helvetica","normal");
doc.setFontSize(8);
doc.text(
"Generado: " + formatearFecha(new Date().toISOString().split("T")[0]),
anchoPagina - margen,
22,
{ align:"right" }
);



let filas =
vacacionesFiltradas.map(v=>[


v.nombre,

v.cedula,

formatearFecha(v.fechaSalida),

formatearFecha(sumarUnDia(v.fechaRegreso)),

v.diasTomados,

v.diasRestantes


]);



doc.autoTable({


startY:36,


head:[[

"Nombre",

"Cédula",

"Del",

"Al",

"Días tomados",

"Días restantes"

]],


headStyles:{

fillColor:[21, 61, 107],

textColor:[255,255,255],

fontStyle:"bold"

},


alternateRowStyles:{

fillColor:[235, 242, 250]

},


styles:{

fontSize:9,

cellPadding:3

},


body:filas


});



doc.save(
"Listado_Vacaciones.pdf"
);


}

//--------------------------------
// GENERAR BOLETA INDIVIDUAL
//--------------------------------

async function generarBoleta(id){


const vacacion = vacaciones.find(
v=>v.id===id
);



if(!vacacion){

    Swal.fire(
        "Error",
        "No se encontró la información",
        "error"
    );

    return;

}



// asignar (o recuperar) el número consecutivo

const correlativo =
await obtenerCorrelativoBoleta(vacacion);



const {jsPDF}=window.jspdf;


const doc = new jsPDF();



//--------------------------------
// LOGO (opcional)
//--------------------------------

// Coloca aquí la ruta de tu logo

const logo = "assets/logo.jpg";



const imgReady = new Image();

imgReady.crossOrigin = "anonymous";

imgReady.src = logo;



imgReady.onload = function(){

    crearContenidoBoleta(doc, vacacion, imgReady, correlativo);

};



imgReady.onerror = function(){

    crearContenidoBoleta(doc, vacacion, null, correlativo);

};


}




//--------------------------------
// CONTENIDO BOLETA (diseño mejorado)
//--------------------------------

function crearContenidoBoleta(doc, v, logoImg, correlativo){


// Paleta de colores
const azulOscuro   = [21, 61, 107];   // encabezado
const azulClaro    = [235, 242, 250]; // fondo de filas
const grisTexto    = [70, 70, 70];
const grisLinea    = [190, 190, 190];
const verdeDestaque= [39, 128, 74];


const anchoPagina = doc.internal.pageSize.getWidth();
const margen = 15;


// Nombre de quien firma como Presidente Junta Directiva
const nombrePresidente = "Alfonso Barrantes Rodríguez";



//--------------------------------
// ENCABEZADO CON FRANJA DE COLOR
//--------------------------------

doc.setFillColor(...azulOscuro);
doc.rect(0, 0, anchoPagina, 44, "F");


if(logoImg){

    try{

        doc.addImage(logoImg, "PNG", margen, 8, 26, 26);

    }catch(e){}

}


doc.setTextColor(255,255,255);
doc.setFont("helvetica","bold");
doc.setFontSize(10.5);
doc.text(
    "Asociación Administradora del Acueducto y Alcantarillado",
    anchoPagina/2,
    9,
    { align:"center" }
);
doc.text(
    "Sanitario de los Ángeles de Grecia",
    anchoPagina/2,
    14.5,
    { align:"center" }
);


doc.setFont("helvetica","bold");
doc.setFontSize(16);
doc.text(
    "BOLETA DE VACACIONES",
    anchoPagina/2,
    26,
    { align:"center" }
);


doc.setFont("helvetica","normal");
doc.setFontSize(9);
doc.text(
    "Documento oficial de aprobación de vacaciones",
    anchoPagina/2,
    33,
    { align:"center" }
);


// Número consecutivo, esquina superior izquierda (sobre el logo)
doc.setFont("helvetica","bold");
doc.setFontSize(9);
doc.text(
    "N.° " + correlativo,
    anchoPagina - margen,
    8,
    { align:"right" }
);


// Fecha de emisión, esquina superior derecha
doc.setFont("helvetica","normal");
doc.setFontSize(8.5);
doc.text(
    "Emitido: " + formatearFecha(new Date().toISOString().split("T")[0]),
    anchoPagina - margen,
    14,
    { align:"right" }
);



//--------------------------------
// SECCIÓN: DATOS DEL FUNCIONARIO
//--------------------------------

let y = 58;


doc.setTextColor(...azulOscuro);
doc.setFont("helvetica","bold");
doc.setFontSize(13);
doc.text("Datos del funcionario", margen, y);


doc.setDrawColor(...azulOscuro);
doc.setLineWidth(0.6);
doc.line(margen, y+2, anchoPagina-margen, y+2);


y += 12;


const altoFila = 10;
const anchoEtiqueta = 55;


// ── Datos generales (fecha de ingreso arriba) ──

const filasDatos = [
    ["Fecha de ingreso", formatearFecha(v.fechaIngreso)],
    ["Nombre completo", v.nombre],
    ["Cédula", v.cedula],
    ["Puesto / Ocupación", v.puesto || "-"],
];


filasDatos.forEach((fila, i)=>{

    const yFila = y + i*altoFila;

    if(i % 2 === 0){

        doc.setFillColor(...azulClaro);
        doc.rect(margen, yFila-6, anchoPagina - margen*2, altoFila, "F");

    }

    doc.setFont("helvetica","bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...grisTexto);
    doc.text(fila[0], margen+3, yFila);

    doc.setFont("helvetica","normal");
    doc.text(String(fila[1]), margen+anchoEtiqueta, yFila);

});


y += filasDatos.length*altoFila + 8;


// ── Subtítulo: Solicita vacaciones (mismo estilo que "Datos del funcionario") ──

doc.setTextColor(...azulOscuro);
doc.setFont("helvetica","bold");
doc.setFontSize(13);
doc.text("Solicita vacaciones", margen, y);

doc.setDrawColor(...azulOscuro);
doc.setLineWidth(0.6);
doc.line(margen, y+2, anchoPagina-margen, y+2);

y += 12;


const filasFechas = [
    ["Del", formatearFecha(v.fechaSalida)],
    ["Al", formatearFecha(v.fechaRegreso)],
    ["Fecha de Regreso", formatearFecha(sumarUnDia(v.fechaRegreso))],
];


filasFechas.forEach((fila, i)=>{

    const yFila = y + i*altoFila;

    if(i % 2 === 0){

        doc.setFillColor(...azulClaro);
        doc.rect(margen, yFila-6, anchoPagina - margen*2, altoFila, "F");

    }

    doc.setFont("helvetica","bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...grisTexto);
    doc.text(fila[0], margen+3, yFila);

    doc.setFont("helvetica","normal");
    doc.text(String(fila[1]), margen+anchoEtiqueta, yFila);

});


y += filasFechas.length*altoFila + 10;



//--------------------------------
// DESTACADO: DÍAS DISPONIBLES / DISFRUTADOS / RESTANTES
//--------------------------------

const diasDisponibles =
    Number(v.diasTomados||0) + Number(v.diasRestantes||0);


const azulDestaque = [21, 61, 107];


doc.setTextColor(...azulOscuro);
doc.setFont("helvetica","bold");
doc.setFontSize(13);
doc.text("Desglose de vacaciones", margen, y);

doc.setDrawColor(...azulOscuro);
doc.setLineWidth(0.6);
doc.line(margen, y+2, anchoPagina-margen, y+2);

y += 12;


const columnas = [
    { titulo:"Días disponibles", valor:diasDisponibles, color:azulDestaque },
    { titulo:"Días disfrutados", valor:v.diasTomados,   color:verdeDestaque },
    { titulo:"Días restantes",   valor:v.diasRestantes, color:[176, 58, 46] },
];


const anchoTotal = anchoPagina - margen*2;
const espacio = 5;
const anchoCol = (anchoTotal - espacio*2) / 3;
const altoCol = 26;


columnas.forEach((col, i)=>{

    const x = margen + i*(anchoCol + espacio);

    doc.setFillColor(...col.color);
    doc.roundedRect(x, y, anchoCol, altoCol, 2, 2, "F");

    doc.setTextColor(255,255,255);
    doc.setFont("helvetica","normal");
    doc.setFontSize(9);
    doc.text(col.titulo, x + anchoCol/2, y+9, { align:"center" });

    doc.setFont("helvetica","bold");
    doc.setFontSize(15);
    doc.text(String(col.valor), x + anchoCol/2, y+19, { align:"center" });

});


y += altoCol + 12;



//--------------------------------
// FECHA DE APROBACIÓN
//--------------------------------

doc.setTextColor(...grisTexto);
doc.setFont("helvetica","normal");
doc.setFontSize(10.5);



y += 34;



//--------------------------------
// FIRMAS
//--------------------------------

doc.setDrawColor(...grisLinea);
doc.setLineWidth(0.4);


doc.line(margen, y, margen+70, y);
doc.line(anchoPagina-margen-70, y, anchoPagina-margen, y);


// Etiqueta debajo de la línea

doc.setFont("helvetica","normal");
doc.setFontSize(9.5);
doc.setTextColor(...grisTexto);

doc.text(
    "Firma persona que toma vacaciones",
    margen+35,
    y+6,
    { align:"center" }
);

doc.text(
    "Presidente Junta Directiva",
    anchoPagina-margen-35,
    y+6,
    { align:"center" }
);


// Nombre correspondiente debajo de la etiqueta

doc.setFont("helvetica","bold");
doc.setFontSize(10);
doc.setTextColor(...grisTexto);

doc.text(
    v.nombre,
    margen+35,
    y+13,
    { align:"center" }
);

doc.text(
    nombrePresidente,
    anchoPagina-margen-35,
    y+13,
    { align:"center" }
);



//--------------------------------
// PIE DE PÁGINA
//--------------------------------

const altoPagina = doc.internal.pageSize.getHeight();

doc.setDrawColor(...grisLinea);
doc.setLineWidth(0.2);
doc.line(margen, altoPagina-15, anchoPagina-margen, altoPagina-15);

doc.setFontSize(8);
doc.setTextColor(150,150,150);
doc.text(
    "Documento generado automáticamente por el sistema de gestión de vacaciones",
    anchoPagina/2,
    altoPagina-10,
    { align:"center" }
);



//--------------------------------
// GUARDAR
//--------------------------------

doc.save(
    correlativo + "_Boleta_Vacaciones_"+v.nombre+".pdf"
);


}