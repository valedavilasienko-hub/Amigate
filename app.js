const db = window.amigateSupabase;

const mapLoading =
  document.getElementById("mapLoading");

const selectedPanel =
  document.getElementById("selectedPanel");

const selectedProvinceName =
  document.getElementById("selectedProvinceName");

const exploreButton =
  document.getElementById("exploreButton");

let selectedProvince = null;

let provinces = [];

let layersByProvince = new Map();


/* =====================================================
   MAPA
===================================================== */

const map = L.map(
  "argentinaMap",
  {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false
  }
);


/* =====================================================
   NORMALIZAR NOMBRES
===================================================== */

function normalizeText(text = "") {

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();

}


/* =====================================================
   SUPABASE
===================================================== */

async function loadProvincesFromDatabase() {

  const { data, error } =
    await db
      .from("provinces")
      .select("id, nombre")
      .eq("activa", true);


  if (error) {

    console.error(error);

    throw error;

  }


  provinces = data || [];

}


/* =====================================================
   RELACIONAR GEOJSON CON SUPABASE
===================================================== */

function findProvince(name) {

  const geoName = normalizeText(name);


  return provinces.find(province => {

    const dbName =
      normalizeText(province.nombre);


    /* CABA */

    if (
      geoName.includes("ciudad autonoma")
      &&
      (
        dbName.includes("ciudad autonoma")
        ||
        dbName === "caba"
      )
    ) {

      return true;

    }


    /* TIERRA DEL FUEGO */

    if (
      geoName.includes("tierra del fuego")
      &&
      dbName.includes("tierra del fuego")
    ) {

      return true;

    }


    return (
      geoName === dbName
      ||
      geoName.includes(dbName)
      ||
      dbName.includes(geoName)
    );

  });

}


/* =====================================================
   ESTILOS
===================================================== */

function normalStyle() {

  return {
    color: "#ffffff",
    weight: 2,
    fillColor: "#edbba7",
    fillOpacity: 1
  };

}


function hoverStyle() {

  return {
    color: "#ffffff",
    weight: 2,
    fillColor: "#f08d65",
    fillOpacity: 1
  };

}


function selectedStyle() {

  return {
    color: "#ffffff",
    weight: 2.5,
    fillColor: "#e96b45",
    fillOpacity: 1
  };

}


/* =====================================================
   SELECCIONAR
===================================================== */

function selectProvince(province, layer) {

  if (!province) return;


  selectedProvince = province;


  layersByProvince.forEach(currentLayer => {

    currentLayer.setStyle(
      normalStyle()
    );

  });


  if (layer) {

    layer.setStyle(
      selectedStyle()
    );

    layer.bringToFront();

  }


  selectedProvinceName.textContent =
    province.nombre;


  selectedPanel.classList.remove(
    "hidden"
  );


  exploreButton.textContent =
    `Explorar ${province.nombre}`;


  localStorage.setItem(
    "amigate_province",
    JSON.stringify(province)
  );

}


/* =====================================================
   DESCARGAR GEOJSON
===================================================== */

async function fetchGeoJSON() {

  const urls = [

    "https://apis.datos.gob.ar/georef/api/v2.0/provincias.geojson",

    "https://apis.datos.gob.ar/georef/api/provincias.geojson"

  ];


  for (const url of urls) {

    try {

      const response =
        await fetch(url);


      if (!response.ok) {

        continue;

      }


      const data =
        await response.json();


      if (
        data
        &&
        data.type === "FeatureCollection"
      ) {

        return data;

      }

    }
    catch (error) {

      console.warn(
        "Falló:",
        url
      );

    }

  }


  throw new Error(
    "No se pudo descargar el GeoJSON."
  );

}


/* =====================================================
   CARGAR MAPA
===================================================== */

async function loadMap() {

  try {

    await loadProvincesFromDatabase();


    const geoData =
      await fetchGeoJSON();


    const geoLayer =
      L.geoJSON(
        geoData,
        {

          style: normalStyle,


          onEachFeature(
            feature,
            layer
          ) {

            const name =
              feature.properties?.nombre
              ||
              feature.properties?.name
              ||
              "";


            const province =
              findProvince(name);


            if (!province) {

              console.warn(
                "Provincia no encontrada:",
                name
              );

              return;

            }


            layersByProvince.set(
              province.id,
              layer
            );


            layer.on({

              mouseover() {

                if (
                  selectedProvince?.id
                  !== province.id
                ) {

                  layer.setStyle(
                    hoverStyle()
                  );

                }

              },


              mouseout() {

                if (
                  selectedProvince?.id
                  === province.id
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

              },


              click() {

                selectProvince(
                  province,
                  layer
                );

              }

            });


            layer.bindTooltip(
              province.nombre,
              {
                sticky: true
              }
            );

          }

        }
      )
      .addTo(map);


    map.fitBounds(
      geoLayer.getBounds(),
      {
        padding: [20, 20]
      }
    );


    mapLoading.classList.add(
      "hidden"
    );


    restoreProvince();

  }
  catch (error) {

    console.error(error);


    mapLoading.textContent =
      "No pudimos cargar el mapa.";

  }

}


/* =====================================================
   RESTAURAR PROVINCIA
===================================================== */

function restoreProvince() {

  const stored =
    localStorage.getItem(
      "amigate_province"
    );


  if (!stored) return;


  try {

    const saved =
      JSON.parse(stored);


    const province =
      provinces.find(
        item =>
          item.id === saved.id
      );


    if (!province) return;


    const layer =
      layersByProvince.get(
        province.id
      );


    selectProvince(
      province,
      layer
    );

  }
  catch {

    localStorage.removeItem(
      "amigate_province"
    );

  }

}


/* =====================================================
   EXPLORAR
===================================================== */

exploreButton.addEventListener(
  "click",
  () => {

    if (!selectedProvince) return;


    /*
      En el próximo paso esto abrirá
      la página correspondiente
      a la provincia.
    */

    console.log(
      "Explorar:",
      selectedProvince.nombre
    );

  }
);


/* =====================================================
   INICIAR
===================================================== */

loadMap();
