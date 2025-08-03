// Switching to Auth with PCKE: Implicit Grant is deprecated
// Setting up client id and redirect uri form web api
const clientId = "c41a56045bc44c9fbaf18dbb27c4f7de";
const redirectUri = window.location.origin + window.location.pathname;

// PKCE Helpers
function makeVerifier () {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return Array.from(array).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

// PKCE verifier in challenge(from documentation)
async function makeChallenge(verifier) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", 
        new TextEncoder().encode(verifier)
    );
    const hashArray = new Uint8Array(hashBuffer);
    const base64 = btoa(String.fromCharCode(...hashArray));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

//Once page loads, login handle
(async function authenticate() {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    const storedToken = sessionStorage.getItem("sessionToken");

    if (storedToken) return;

    if (codeParam) {
        const verifier = sessionStorage.getItem("sessionVerifier");
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: codeParam,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: verifier
        });

        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });
        const {access_token} = await tokenResponse.json();
        sessionStorage.setItem("sessionToken", access_token);
        window.history.replaceState({}, "", redirectUri);
        return;
    }

    // begin the PKCE login
    const verifier = makeVerifier();
    const challenge = await makeChallenge(verifier);
    sessionStorage.setItem("sessionVerifier", verifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", challenge);

    window.location = authUrl;
})();



// Function to get the access token
function getAccessToken() {
    const token = sessionStorage.getItem("sessionToken");
    if (!token) {
        throw new Error("You're not authenticated- please retry!");
    }
    return token;
};

// Call the search endpooint for the artist
async function searchArtist(name) {
    const token = getAccessToken();
    const authHeader = { Authorization: `Bearer ${token}` };
    // using the search api url
    const searchUrl = `https://api.spotify.com/v1/search`
                     + `?q=${encodeURIComponent(name)}`
                     + `&type=artist&limit=1`;

const searchResponse = await fetch(searchUrl, {
    headers: {Authorization: `Bearer ${token}`}
});

if (!searchResponse.ok) {
    console.error(
        "Artist search failed:", 
        await searchResponse.text()
    );
    return null;
}

//Parse the json response
const searchData = await searchResponse.json();

// Return the artist
return searchData.artists.items[0] || null;
}


// Get the top 5 tracks of the artist using their id
async function fetchTopTracks(artistId) {
    const token = getAccessToken();
    const authHeader = { Authorization: `Bearer ${token}`};

    // Using the track endpoint
    const tracksUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`;
    const topTracksRes = await fetch(tracksUrl, {headers: authHeader});

    // Parse the Json res
    const topTracksData = await topTracksRes.json();

    // return the top 5 tracks
    return topTracksData.tracks.slice(0, 5);
};

// Rendering the artist info along with
// their top 5 tracks as well
function renderArtistTracks(artist, tracks) {
    const container = document.getElementById("output");
    container.innerHTML = "";

    // if no artist is found- display a msg
    if (!artist) {
        container.textContent = "No artist found! please try again!";
        return;
    };


    const artistName = document.createElement("h2");
    artistName.textContent = artist.name;
    container.appendChild(artistName);

    const artistImage = artist.images[0]?.url;
    if (artistImage) {
        const image = document.createElement("img");
        image.src = artistImage;
        image.alt = artist.name;
        image.width = 150;
        container.appendChild(image);
    };

    const followers = document.createElement("p");
    followers.textContent = `Followers: ${artist.followers.total.toLocaleString()}`;
    container.appendChild(followers);

    const genres = document.createElement("p");
    genres.textContent = "Genres: " + (artist.genres.join(", ") || "N/A");
    container.appendChild(genres);

    // Music traks heading
    const musicTracks = document.createElement("h3");
    musicTracks.textContent = "Top Tracks";
    container.appendChild(musicTracks);

    // Top Tracks List
    const tracksList = document.createElement("ol");
    tracks.forEach(track => {
        const trackItem = document.createElement("li");
        trackItem.textContent = track.name;
        tracksList.appendChild(trackItem);
    });

    container.appendChild(tracksList);
}

// setting up the search button
// fetch the artist + song tracks and render to page
document.getElementById("searchBtn").onclick = async () => {
    const query = document.getElementById("artistInput").value.trim();
    if (!query) return;

    // Show a msg while user wait eg. loading srtist
document.getElementById("output").textContent = "Loading artist info...";

try {
    const artist = await searchArtist(query);
    const topTracks = artist ? await fetchTopTracks(artist.id) : [];
    renderArtistTracks(artist, topTracks);
} catch (err) {
    console.error(err);
    document.getElementById("output").textContent = "Error occured!";
}
};

