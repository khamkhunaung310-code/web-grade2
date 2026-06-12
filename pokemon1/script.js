let offset = 0;
const limit = 20;
let isLoading = false;

// Event listener to detect scrolling
window.addEventListener('scroll', () => {
    // Check if the user has scrolled near the bottom of the page
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        fetchPokemonList();
    }
});

// Load the first batch of Pokémon when the page loads
fetchPokemonList();

function fetchPokemonList() {
    // Prevent multiple simultaneous API calls
    if (isLoading) return;
    isLoading = true;
    document.getElementById('loader').style.display = 'block';

    // Fetch a list of Pokémon with pagination (limit and offset)
    fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`)
        .then(response => response.json())
        .then(async data => {
            const results = data.results;

            // Loop through each Pokémon to get its detailed data (image, types)
            for (let pokemon of results) {
                await fetchPokemonDetails(pokemon.url);
            }

            // Move the offset forward for the next batch
            offset += limit;
            isLoading = false;
            document.getElementById('loader').style.display = 'none';
        })
        .catch(err => {
            console.error("Error fetching Pokémon list:", err);
            isLoading = false;
        });
}

function fetchPokemonDetails(url) {
    // Return the fetch promise so we can await it sequentially
    return fetch(url)
        .then(response => response.json())
        .then(pokeData => {
            createPokemonCard(pokeData);
        });
}

function createPokemonCard(pokeData) {
    const grid = document.getElementById('pokedexGrid');

    // Create container element for the card
    const card = document.createElement('div');
    card.classList.add('pokemon-card');

    // Format ID number (e.g., #001, #025)
    const pokeId = String(pokeData.id).padStart(3, '0');

    // Get primary type of the Pokémon
    const primaryType = pokeData.types[0].type.name;

    // Construct the card's internal HTML content
    card.innerHTML = `
        <img src="${pokeData.sprites.front_default}" alt="${pokeData.name}">
        <span class="id-number">#${pokeId}</span>
        <h3>${pokeData.name}</h3>
        <span class="badge-${primaryType} type-badge">${primaryType}</span>
    `;

    // Append the newly created card to the main grid
    grid.appendChild(card);
}