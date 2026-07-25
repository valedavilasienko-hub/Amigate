const db = window.amigateSupabase;


/* =========================================================
   VARIABLES
========================================================= */

const mapLoading =
  document.getElementById("mapLoading");

const selectedProvinceName =
  document.getElementById("selectedProvinceName");

const exploreProvinceButton =
  document.getElementById("exploreProvinceButton");

const changeProvinceButton =
  document.getElementById("changeProvinceButton");

const provinceSearch =
  document.getElementById("provinceSearch");

const provinceSuggestions =
  document.getElementById("provinceSuggestions");

const categoriesTitle =
  document.getElementById("categoriesTitle");

const categoriesSubtitle =
  document.getElementById("categoriesSubtitle");


let selectedProvince = null;

let provinceDatabase = [];

let geojsonLayer = null;

let provinceLayers = new Map();


/* =========================================================
   MAPA
========================================================= */

const map = L.map(
  "argentinaMap",
  {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    dragging: true,
    touchZoom: false
  }
);


/*
   Ocultamos completamente el mapa base.
   Queremos únicamente la silueta/provincias.
*/

map.setView(
  [-38.4, -63.6],
  4
);


/* =========================================================
   NORMALIZAR TEXTO
========================================================= */

function normalizeText(text = "") {

  return text
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();

}


/* =========================================================
   CARGAR PROVINCIAS DE SUPABASE
========================================================= */

async function loadProvinceDatabase() {

  const { data, error } =
    await db
      .from("provinces")
      .select(
        "id, nombre"
      )
      .eq(
        "activa",
        true
      )
      .order(
        "nombre",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Error Supabase:",
      error
    );

    return;

  }


  provinceDatabase =
    data || [];

}


/* =========================================================
   BUSCAR PROVINCIA EN SUPABASE POR NOMBRE
========================================================= */

function findDatabaseProvince(
  geoProvinceName
) {

  const geoName =
    normalizeText(
      geoProvinceName
    );


  return provinceDatabase.find(
    province => {

      const dbName =
        normalizeText(
          province.nombre
        );


      /*
        CASOS ESPECIALES
      */

      if (
        geoName.includes(
          "ciudad autonoma"
        )
        &&
        (
          dbName.includes(
            "ciudad autonoma"
          )
          ||
          dbName === "caba"
        )
      ) {

        return true;

      }


      if (
        geoName ===
        "tierra del fuego, antartida e islas del atlantico sur"
        &&
        dbName.includes(
          "tierra del fuego"
        )
      ) {

        return true;

      }


      return (
        geoName === dbName
        ||
        geoName.includes(
          dbName
        )
        ||
        dbName.includes(
          geoName
        )
      );

    }
  );

}


/* =========================================================
   ESTILO NORMAL DEL MAPA
========================================================= */

function normalStyle() {

  return {

    color: "#ffffff",

    weight: 2,

    fillColor: "#efc1ae",

    fillOpacity: 1

  };

}


/* =========================================================
   ESTILO SELECCIONADO
========================================================= */

function selectedStyle() {

  return {

    color: "#ffffff",

    weight: 2.5,

    fillColor: "#e96b45",

    fillOpacity: 1

  };

}


/* =========================================================
   SELECCIONAR PROVINCIA
========================================================= */

function selectProvince(
  province,
  layer
) {

  if (!province) {
    return;
  }


  selectedProvince =
    province;


  /*
    RESETEAR TODAS
  */

  provinceLayers.forEach(
    itemLayer => {

      itemLayer.setStyle(
        normalStyle()
      );

    }
  );


  /*
    RESALTAR ELEGIDA
  */

  if (layer) {

    layer.setStyle(
      selectedStyle()
    );

    layer.bringToFront();

  }


  selectedProvinceName.textContent =
    province.nombre;


  exploreProvinceButton.disabled =
    false;


  exploreProvinceButton.textContent =
    `Explorar ${province.nombre}`;


  changeProvinceButton.classList.remove(
    "hidden"
  );


  provinceSearch.value =
    province.nombre;


  provinceSuggestions.innerHTML =
    "";


  localStorage.setItem(
    "amigate_province",
    JSON.stringify(
      province
    )
  );


  updateCategorySection();

}


/* =========================================================
   ACTUALIZAR CATEGORÍAS
========================================================= */

function updateCategorySection() {

  if (!selectedProvince) {

    categoriesTitle.textContent =
      "¿Qué estás buscando?";

    categoriesSubtitle.textContent =
      "Primero elegí tu provincia.";

    return;

  }


  categoriesTitle.textContent =
    `¿Qué estás buscando en ${selectedProvince.nombre}?`;


  categoriesSubtitle.textContent =
    `Explorá marcas, productos, servicios y oportunidades disponibles en ${selectedProvince.nombre}.`;

}


/* =========================================================
   RESTAURAR PROVINCIA GUARDADA
========================================================= */

function restoreSavedProvince() {

  const saved =
    localStorage.getItem(
      "amigate_province"
    );


  if (!saved) {
    return;
  }


  try {

    const parsed =
      JSON.parse(saved);


    const current =
      provinceDatabase.find(
        province =>
          province.id ===
          parsed.id
      );


    if (!current) {
      return;
    }


    const layer =
      provinceLayers.get(
        current.id
      );


    selectProvince(
      current,
      layer
    );

  }

  catch (error) {

    localStorage.removeItem(
      "amigate_province"
    );

  }

}


/* =========================================================
   CARGAR GEOJSON OFICIAL
========================================================= */

async function loadArgentinaMap() {

  try {

    /*
      GEOJSON OFICIAL
      API GEOREF ARGENTINA
    */

    const response =
      await fetch(
        "https://apis.datos.gob.ar/georef/api/v2.0/provincias.geojson"
      );


    if (!response.ok) {

      throw new Error(
        "No fue posible obtener el mapa."
      );

    }


    const geoData =
      await response.json();


    geojsonLayer =
      L.geoJSON(
        geoData,
        {

          style:
            normalStyle,


          onEachFeature:
            (
              feature,
              layer
            ) => {


              /*
                Dependiendo de la versión del
                GeoJSON oficial, el nombre
                puede venir directamente
                o dentro de propiedades.
              */

              const geoName =
                feature.properties?.nombre
                ||
                feature.properties?.name
                ||
                feature.nombre
                ||
                "";


              const province =
                findDatabaseProvince(
                  geoName
                );


              if (province) {

                provinceLayers.set(
                  province.id,
                  layer
                );

              }


              /*
                DESKTOP HOVER
              */

              layer.on(
                "mouseover",
                () => {

                  if (
                    !selectedProvince
                    ||
                    selectedProvince.id
                    !== province?.id
                  ) {

                    layer.setStyle({
                      fillColor:
                        "#f49a73"
                    });

                  }

                }
              );


              layer.on(
                "mouseout",
                () => {

                  if (
                    selectedProvince
                    &&
                    selectedProvince.id
                    === province?.id
                  ) {

                    layer.setStyle(
                      selectedStyle()
                    );

                  }
                  else {

                    layer.setStyle(
                      normalStyle()
                    );

                  }

                }
              );


              /*
                CLICK / TOUCH
              */

              layer.on(
                "click",
                () => {

                  if (!province) {
                    return;
                  }

                  selectProvince(
                    province,
                    layer
                  );

                }
              );


              /*
                TOOLTIP
              */

              if (province) {

                layer.bindTooltip(
                  province.nombre,
                  {
                    sticky: true,
                    direction: "top"
                  }
                );

              }

            }

        }
      )
      .addTo(map);


    /*
      AJUSTAR EL MAPA AL PAÍS
    */

    map.fitBounds(
      geojsonLayer.getBounds(),
      {
        padding: [20, 20]
      }
    );


    mapLoading.classList.add(
      "hidden"
    );


    restoreSavedProvince();

  }

  catch (error) {

    console.error(
      "Error cargando mapa:",
      error
    );


    mapLoading.textContent =
      "No pudimos cargar el mapa.";

  }

}


/* =========================================================
   BUSCADOR DE PROVINCIAS
========================================================= */

provinceSearch.addEventListener(
  "input",
  () => {

    const value =
      normalizeText(
        provinceSearch.value
      );


    provinceSuggestions.innerHTML =
      "";


    if (!value) {
      return;
    }


    const matches =
      provinceDatabase
        .filter(
          province =>
            normalizeText(
              province.nombre
            )
            .includes(
              value
            )
        )
        .slice(
          0,
          6
        );


    matches.forEach(
      province => {

        const button =
          document.createElement(
            "button"
          );


        button.className =
          "province-suggestion";


        button.textContent =
          province.nombre;


        button.addEventListener(
          "click",
          () => {

            const layer =
              provinceLayers.get(
                province.id
              );


            selectProvince(
              province,
              layer
            );

          }
        );


        provinceSuggestions.appendChild(
          button
        );

      }
    );

  }
);


/* =========================================================
   CAMBIAR PROVINCIA
========================================================= */

changeProvinceButton.addEventListener(
  "click",
  () => {

    selectedProvince =
      null;


    localStorage.removeItem(
      "amigate_province"
    );


    provinceLayers.forEach(
      layer => {

        layer.setStyle(
          normalStyle()
        );

      }
    );


    selectedProvinceName.textContent =
      "Ninguna";


    exploreProvinceButton.disabled =
      true;


    exploreProvinceButton.textContent =
      "Seleccioná una provincia";


    provinceSearch.value =
      "";


    changeProvinceButton.classList.add(
      "hidden"
    );


    updateCategorySection();

  }
);


/* =========================================================
   EXPLORAR PROVINCIA
========================================================= */

exploreProvinceButton.addEventListener(
  "click",
  () => {

    if (!selectedProvince) {
      return;
    }


    document
      .getElementById(
        "categorias"
      )
      .scrollIntoView({
        behavior: "smooth"
      });

  }
);


/* =========================================================
   CATEGORÍAS
========================================================= */

document
  .querySelectorAll(
    ".category-card"
  )
  .forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          if (!selectedProvince) {

            document
              .getElementById(
                "explorar"
              )
              .scrollIntoView({
                behavior: "smooth"
              });


            return;

          }


          const category =
            card.dataset.category;


          console.log(
            "Categoría:",
            category
          );


          console.log(
            "Provincia:",
            selectedProvince
          );


          /*
            EN EL PRÓXIMO PASO
            ESTA ACCIÓN ABRIRÁ
            LOS RESULTADOS REALES.
          */

        }
      );

    }
  );


/* =========================================================
   INICIAR
========================================================= */

async function init() {

  await loadProvinceDatabase();

  await loadArgentinaMap();

}

init();
