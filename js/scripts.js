// Setting up client id and redirect uri form web api
const clientId = "c41a56045bc44c9fbaf18dbb27c4f7de";
const redirectUri = window.location.origin;

// Function to redirect user to Spotify's login for token
function login() {
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    window.location = authUrl.toString();
};

// Function to parse the access token from the URL
function getToken() {
    const hash = window.location.hash.substring(1); // this is to remove the # symbol when the url is retrieved from spotify
    const params = new URLSearchParams(hash);
    return params.get("acess_token");
};

// Check URL for token
let spotifyToken = sessionStorage.getItem("spotifyToken");
if (!spotifyToken) {
    const token = getToken();

    if (token) {
        sessionStorage.setItem("spotifyToken", token);
        spotifyToken = token;
    }
}

// Search artist name
async function searchArtist(name) {
    // redirect user to login if they don't have a token
    if (!spotifyToken) {
        login();
        return null;
    }

    // Building the spotify search api url
    const url = `https://api.spotify.com/v1/search?` +
    `q=${encodeURIComponent(name)}` +
    `&type=artist&limit=1`;

    // Call the API with token
    const res = await fetch(url, {
        headers: { 
            "Authorization": `Bearer ${spotifyToken}`
        }
    });

    // Parse the Json response
    const data = await res.json();
    
    // Return the artist
    return data.artists.items[0];
};

// Get the top 5 tracks of the artist using their id
async function getTopTracks(artistId) {
    // send user to login if there'rs no token yet
    if (!spotifyToken) {
        login();
        return [];
    };

    // Building the spotify top tracks with the api url
    const url = `https://api.spotify.com/v1/artists/{id}/top-tracks?market=CA`;

    // Call API
    const res = await fetch(url, {
        headers: {
            "Authorization":`Bearer ${spotifyToken}`
        }
    });

    // Parse the JSON res
    const data = await res.json();

    // Return the top 5 tracks array
    return data.tracks.slice(0, 5);
};

// Rendering the artist profile
// get the top tracks as well
function renderArtistTracks(artist, tracks) {
    const output = document.getElementById("output");
    output.innerHTML = "";

    // if no artist is found- display a msg
    if (!artist) {
        const msg = document.createElement("p");
        msg.textContent = "No artist found! please try again!";
        output.appendChild(msg);
        return;
    };

    // the container of the artist: name, image, followers, genre of music
    const container = document.createElement("div");

    const artistName = document.createElement("h2");
    artistName.textContent = artist.name;
    container.appendChild(artistName);

    const imgUrl = artist.images[1]?.url || artist.images[0]?.url;
    if (imgUrl) {
        const imgEl = document.createElement("img");
        imgEl.src = imgUrl;
        imgEl.alt = artist.name;
        imgEl.width = 150;
        container.appendChild(imgEl);
    };

    const followersEl = document.createElement("p");
    followersEl.textContent = `Followers: ${artist.followers.total.toLocaleString()}`;
    container.appendChild(followersEl);

    const genresEl = document.createElement("p");
    const genreText = artist.genres && artist.genres.length ? artist.genres.join(", ") : "N/A";
    genresEl.textContent = `Genres: ${genreText}`;
    container.appendChild(genresEl);

    const musicTracks = document.createElement("h3");
    musicTracks.textContent = "Top Tracks";
    container.appendChild(musicTracks);

    // if there's no song tracks
    // display msg and skip list
    if (!tracks.length) {
        const noMsg = document.createElement("p");
        noMsg.textContent = "This artist has no top tracks currently available!";
        container.appendChild(noMsg);
    } else {

        // else display the list of songs
        const list = document.createElement("ol");
    tracks.forEach(track => {
        const li = document.createElement("li");
        li.textContent = track.name;
        list.appendChild(li);
    });
    container.appendChild(list);
    }

    output.appendChild(container);
}

// setting up the search button
// fetch the artist + song tracks and render to page
const searchBtn = document.getElemenetById("searchBtn");
const artistInput = document.getElemenetById("artistInput");
const output = document.getElemenetById("output");

searchBtn.addEventListener("click", async () => {
    const name = artistInput.value();
    if (!name) return;

    // Show a msg while user wait eg. loading srtist
    output.textContent = "Loading artist...";

    // fetch the artist
    const artist = await searchArtist(name);

    const tracks = artist ? await getTopTracks(artist.id) : [];

    renderArtistTracks(artist, tracks);
});

