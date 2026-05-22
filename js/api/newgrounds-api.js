// js/api/newgrounds-api.js
export class NewgroundsAPI {
  constructor() {
    this.apiKey = null;
    this.sessionId = null;
    this.userId = null;
    this.baseUrl = 'https://newgrounds.io/gateway_v3.php';
    this.audioCache = new Map();
    this.initialized = false;
  }

  async initialize(apiKey) {
    this.apiKey = apiKey;
    
    try {
      // Iniciar sesión
      const sessionResult = await this.makeRequest('App.startSession', {});
      
      if (sessionResult.success) {
        this.sessionId = sessionResult.session.id;
        this.initialized = true;
        return true;
      }
    } catch (error) {
      console.error('Error inicializando Newgrounds API:', error);
    }
    
    return false;
  }

  async makeRequest(component, parameters = {}) {
    if (!this.apiKey) {
      throw new Error('API Key no configurada');
    }

    const request = {
      app_id: this.apiKey,
      session_id: this.sessionId,
      call: {
        component: component,
        parameters: parameters
      }
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (data.success) {
        return data.result?.data || data.result;
      } else {
        throw new Error(data.error?.message || 'Error en la API de Newgrounds');
      }
    } catch (error) {
      console.error('Error en solicitud Newgrounds:', error);
      throw error;
    }
  }

  // Obtener información de una canción por ID
  async getSongInfo(songId) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Gateway.getSongInfo', {
        id: parseInt(songId)
      });

      return {
        id: result.id,
        name: result.name,
        artist: result.artist,
        url: result.url,
        duration: result.duration,
        tags: result.tags || [],
        rating: result.rating,
        downloads: result.downloads,
        icon: result.icon_url,
        isVerified: result.is_verified || false
      };
    } catch (error) {
      console.error('Error obteniendo info de canción:', error);
      return null;
    }
  }

  // Buscar canciones
  async searchSongs(query, options = {}) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Gateway.searchSongs', {
        query: query,
        page: options.page || 1,
        limit: options.limit || 20,
        sort: options.sort || 'rating',
        genre: options.genre || null,
        duration_min: options.minDuration || null,
        duration_max: options.maxDuration || null
      });

      return result.songs?.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artist,
        duration: song.duration,
        rating: song.rating,
        icon: song.icon_url,
        url: song.url
      })) || [];
    } catch (error) {
      console.error('Error buscando canciones:', error);
      return [];
    }
  }

  // Obtener canciones populares
  async getPopularSongs(limit = 20) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Gateway.getPopularSongs', {
        limit: limit
      });

      return result.songs?.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artist,
        duration: song.duration,
        rating: song.rating,
        icon: song.icon_url,
        plays: song.plays
      })) || [];
    } catch (error) {
      console.error('Error obteniendo canciones populares:', error);
      return [];
    }
  }

  // Obtener URL de streaming de audio
  async getAudioStreamUrl(songId) {
    try {
      const songInfo = await this.getSongInfo(songId);
      
      if (songInfo && songInfo.url) {
        return songInfo.url;
      }
      
      // Fallback a URL de previsualización
      return `https://audio.ngfiles.com/${songId}_preview.mp3`;
    } catch (error) {
      console.error('Error obteniendo URL de audio:', error);
      return null;
    }
  }

  // Descargar y cachear audio
  async downloadAudio(songId) {
    // Verificar cache
    if (this.audioCache.has(songId)) {
      return this.audioCache.get(songId);
    }

    try {
      const audioUrl = await this.getAudioStreamUrl(songId);
      
      if (!audioUrl) {
        throw new Error('URL de audio no disponible');
      }

      // Descargar audio
      const response = await fetch(audioUrl);
      
      if (!response.ok) {
        throw new Error('Error descargando audio');
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Convertir a base64
      const base64 = this.arrayBufferToBase64(arrayBuffer);
      
      // Guardar en cache
      this.audioCache.set(songId, base64);
      
      return base64;
    } catch (error) {
      console.error('Error descargando audio:', error);
      return null;
    }
  }

  // Subir nivel a Newgrounds
  async publishLevel(levelData) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Gateway.publishLevel', {
        title: levelData.title,
        description: levelData.description || '',
        difficulty: levelData.difficulty,
        song_id: levelData.songId,
        level_data: JSON.stringify(levelData.gameData),
        tags: levelData.tags || ['geometry', 'dash', 'gd-studio'],
        thumbnail: levelData.thumbnail,
        is_public: levelData.isPublic !== false
      });

      return {
        id: result.level_id,
        url: result.level_url,
        published: true
      };
    } catch (error) {
      console.error('Error publicando nivel:', error);
      return null;
    }
  }

  // Obtener medallas/logros
  async getMedals() {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Medal.getList', {});
      
      return result.medals?.map(medal => ({
        id: medal.id,
        name: medal.name,
        description: medal.description,
        icon: medal.icon,
        unlocked: medal.unlocked || false,
        points: medal.points || 0
      })) || [];
    } catch (error) {
      console.error('Error obteniendo medallas:', error);
      return [];
    }
  }

  // Desbloquear medalla
  async unlockMedal(medalId) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Medal.unlock', {
        id: medalId
      });

      return result.success || false;
    } catch (error) {
      console.error('Error desbloqueando medalla:', error);
      return false;
    }
  }

  // Enviar score
  async submitScore(scoreboardId, score) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('ScoreBoard.postScore', {
        id: scoreboardId,
        value: score
      });

      return result.success || false;
    } catch (error) {
      console.error('Error enviando score:', error);
      return false;
    }
  }

  // Obtener leaderboard
  async getLeaderboard(scoreboardId, limit = 20) {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('ScoreBoard.getScores', {
        id: scoreboardId,
        limit: limit
      });

      return result.scores?.map(score => ({
        rank: score.rank,
        user: score.user?.name || 'Anónimo',
        score: score.value,
        date: score.formatted_date
      })) || [];
    } catch (error) {
      console.error('Error obteniendo leaderboard:', error);
      return [];
    }
  }

  // Iniciar sesión de usuario
  async loginUser() {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      // Redirigir a página de login de Newgrounds
      const loginUrl = `https://newgrounds.com/passport?app_id=${this.apiKey}`;
      
      return new Promise((resolve) => {
        const popup = window.open(loginUrl, 'ng_login', 'width=600,height=400');
        
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            resolve(true);
          }
        }, 500);
        
        // Timeout después de 2 minutos
        setTimeout(() => {
          clearInterval(checkPopup);
          if (!popup.closed) {
            popup.close();
          }
          resolve(false);
        }, 120000);
      });
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  }

  // Obtener perfil de usuario
  async getUserProfile() {
    if (!this.initialized) {
      throw new Error('API no inicializada');
    }

    try {
      const result = await this.makeRequest('Gateway.getCurrentUser', {});
      
      return {
        id: result.id,
        name: result.name,
        icon: result.icon_url,
        level: result.level,
        medals: result.medals_count || 0,
        friends: result.friends_count || 0
      };
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  }

  // Utilidades
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return 'data:audio/mpeg;base64,' + btoa(binary);
  }

  // Verificar si una canción existe
  async songExists(songId) {
    try {
      const song = await this.getSongInfo(songId);
      return !!song;
    } catch {
      return false;
    }
  }

  // Obtener canciones por género
  async getSongsByGenre(genre, limit = 20) {
    return this.searchSongs('', { genre, limit });
  }

  // Obtener canciones por duración
  async getSongsByDuration(minDuration, maxDuration, limit = 20) {
    return this.searchSongs('', { minDuration, maxDuration, limit });
  }
}

// Componente UI para búsqueda de canciones
export class SongSearchUI {
  constructor(containerId, onSelect) {
    this.container = document.getElementById(containerId);
    this.onSelect = onSelect;
    this.api = new NewgroundsAPI();
    this.selectedSong = null;
    
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="song-search">
        <div class="search-header">
          <h3>Buscar Canción en Newgrounds</h3>
          <div class="search-input-wrapper">
            <input type="text" id="songSearchInput" placeholder="Buscar canciones...">
            <button id="searchSongBtn">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
        
        <div class="search-filters">
          <select id="genreFilter">
            <option value="">Todos los géneros</option>
            <option value="electronic">Electrónica</option>
            <option value="dubstep">Dubstep</option>
            <option value="rock">Rock</option>
            <option value="pop">Pop</option>
            <option value="hiphop">Hip Hop</option>
            <option value="jazz">Jazz</option>
            <option value="classical">Clásica</option>
          </select>
          
          <select id="durationFilter">
            <option value="">Cualquier duración</option>
            <option value="short">Corta (&lt; 2 min)</option>
            <option value="medium">Media (2-4 min)</option>
            <option value="long">Larga (&gt; 4 min)</option>
          </select>
        </div>
        
        <div class="popular-songs">
          <h4>Canciones Populares</h4>
          <div id="popularSongsList" class="songs-list"></div>
        </div>
        
        <div class="search-results">
          <h4>Resultados</h4>
          <div id="searchResultsList" class="songs-list"></div>
        </div>
        
        <div class="selected-song" id="selectedSongInfo" style="display: none;">
          <h4>Canción Seleccionada</h4>
          <div class="song-card selected">
            <img src="" alt="Song icon" id="selectedSongIcon">
            <div class="song-info">
              <span id="selectedSongName"></span>
              <span id="selectedSongArtist"></span>
            </div>
            <button id="removeSongBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupListeners();
    this.loadPopularSongs();
  }

  setupListeners() {
    document.getElementById('searchSongBtn')?.addEventListener('click', () => {
      this.searchSongs();
    });

    document.getElementById('songSearchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchSongs();
      }
    });

    document.getElementById('removeSongBtn')?.addEventListener('click', () => {
      this.removeSong();
    });
  }

  async loadPopularSongs() {
    try {
      const songs = await this.api.getPopularSongs(10);
      this.renderSongList('popularSongsList', songs);
    } catch (error) {
      console.error('Error cargando canciones populares:', error);
    }
  }

  async searchSongs() {
    const query = document.getElementById('songSearchInput')?.value || '';
    const genre = document.getElementById('genreFilter')?.value;
    
    let minDuration, maxDuration;
    const durationFilter = document.getElementById('durationFilter')?.value;
    
    if (durationFilter === 'short') {
      maxDuration = 120;
    } else if (durationFilter === 'medium') {
      minDuration = 120;
      maxDuration = 240;
    } else if (durationFilter === 'long') {
      minDuration = 240;
    }

    try {
      const songs = await this.api.searchSongs(query, {
        genre: genre || null,
        minDuration,
        maxDuration,
        limit: 20
      });
      
      this.renderSongList('searchResultsList', songs);
    } catch (error) {
      console.error('Error buscando canciones:', error);
    }
  }

  renderSongList(containerId, songs) {
    const container = document.getElementById(containerId);
    
    if (!songs || songs.length === 0) {
      container.innerHTML = '<p class="no-results">No se encontraron canciones</p>';
      return;
    }

    container.innerHTML = songs.map(song => `
      <div class="song-card" data-song-id="${song.id}" data-song-name="${song.name}" data-song-artist="${song.artist}">
        <img src="${song.icon || 'assets/images/default-song.png'}" alt="${song.name}">
        <div class="song-info">
          <span class="song-name">${this.escapeHtml(song.name)}</span>
          <span class="song-artist">${this.escapeHtml(song.artist)}</span>
          ${song.duration ? `<span class="song-duration">${this.formatDuration(song.duration)}</span>` : ''}
        </div>
        <button class="select-song-btn" data-song-id="${song.id}">
          <i class="fas fa-check"></i>
        </button>
      </div>
    `).join('');

    // Agregar listeners
    container.querySelectorAll('.select-song-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const songCard = e.target.closest('.song-card');
        if (songCard) {
          const songId = songCard.dataset.songId;
          const songName = songCard.dataset.songName;
          const songArtist = songCard.dataset.songArtist;
          const songIcon = songCard.querySelector('img')?.src;
          
          this.selectSong({
            id: songId,
            name: songName,
            artist: songArtist,
            icon: songIcon
          });
        }
      });
    });
  }

  selectSong(song) {
    this.selectedSong = song;
    
    document.getElementById('selectedSongInfo').style.display = 'block';
    document.getElementById('selectedSongIcon').src = song.icon;
    document.getElementById('selectedSongName').textContent = song.name;
    document.getElementById('selectedSongArtist').textContent = song.artist;
    
    if (this.onSelect) {
      this.onSelect(song);
    }
  }

  removeSong() {
    this.selectedSong = null;
    document.getElementById('selectedSongInfo').style.display = 'none';
    
    if (this.onSelect) {
      this.onSelect(null);
    }
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
