const db = window.amigateSupabase;

const provinceGrid = document.getElementById("provinceGrid");

let selectedProvince = null;

async function loadProvinces() {
  try {

    const { data, error } = await db
      .from("provinces")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre", { ascending: true });

    if (error) {
      throw error;
    }

    provinceGrid.innerHTML = "";

    data.forEach((province) => {

      const button = document.createElement("button");

      button.className = "province-card";
      button.textContent = province.nombre;

      button.addEventListener("click", () => {
        selectProvince(province, button);
      });

      provinceGrid.appendChild(button);

    });

  } catch (error) {

    console.error("Error cargando provincias:", error);

    provinceGrid.innerHTML = `
      <p>
        No pudimos cargar las provincias.
      </p>
    `;

  }
}

function selectProvince(province, button) {

  document
    .querySelectorAll(".province-card")
    .forEach((card) => {
      card.classList.remove("selected");
    });

  button.classList.add("selected");

  selectedProvince = province;

  localStorage.setItem(
    "amigate_province",
    JSON.stringify(province)
  );

  console.log(
    `Provincia seleccionada: ${province.nombre}`
  );
}

loadProvinces();
