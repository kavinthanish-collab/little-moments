
import { useState } from 'react';
import { supabase } from './supabase';
import './styles/Login.css';

const STORAGE_KEY = 'littleMomentsAccounts';

function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

async function hashCode(code) {
  const data = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / image.width);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Unable to process image.'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };

      image.onerror = reject;
      image.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function App() {
  const [page, setPage] = useState('welcome');

  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [message, setMessage] = useState('');

  const [activeUser, setActiveUser] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA')
  );

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [photos, setPhotos] = useState([]);
  const [mood, setMood] = useState('');

  const [accounts, setAccounts] = useState(getAccounts);

  function saveAccounts(updatedAccounts) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedAccounts)
      );

      setAccounts(updatedAccounts);
    } catch {
      setMessage(
        'Storage is full. Please remove some photos and try again.'
      );
    }
  }

  // CREATE DIARY ACCOUNT
  async function createDiary() {
    const name = username.trim().toLowerCase();

    if (!name || !code || !confirmCode) {
      setMessage('Please fill in all the details.');
      return;
    }

    if (code.length < 4) {
      setMessage('Your access code must contain at least 4 characters.');
      return;
    }

    if (code !== confirmCode) {
      setMessage('Your access codes do not match.');
      return;
    }

    const currentAccounts = getAccounts();

    if (currentAccounts[name]) {
      setMessage('This username already exists. Please log in.');
      return;
    }

    const codeHash = await hashCode(code);

    currentAccounts[name] = {
      username: username.trim(),
      codeHash,
      memories: {}
    };

    saveAccounts(currentAccounts);

    setActiveUser(name);
    setCode('');
    setConfirmCode('');
    setPage('calendar');
    setMessage('');
  }

  // LOGIN
  async function login() {
    const name = username.trim().toLowerCase();
    const currentAccounts = getAccounts();

    if (!name || !code) {
      setMessage('Enter your username and access code.');
      return;
    }

    const account = currentAccounts[name];

    if (!account) {
      setMessage('Username not found. Please create a diary first.');
      return;
    }

    const enteredHash = await hashCode(code);

    if (enteredHash !== account.codeHash) {
      setMessage('Incorrect access code. Try again.');
      return;
    }

    setAccounts(currentAccounts);
    setActiveUser(name);
    setCode('');
    setPage('calendar');
    setMessage('');
  }

  // OPEN A CALENDAR DATE
  function openDate(date) {
    const currentAccounts = getAccounts();
    const memory = currentAccounts[activeUser]?.memories?.[date];

    setSelectedDate(date);
    setTitle(memory?.title || '');
    setThought(memory?.thought || '');
    setMood(memory?.mood || '');
    function openDate(date) {
      const currentAccounts = getAccounts();
      const memory = currentAccounts[activeUser]?.memories?.[date];

      setSelectedDate(date);
      setTitle(memory?.title || '');
      setThought(memory?.thought || '');
      setMood(memory?.mood || '');

      // Support old single-photo memories and new multiple-photo memories
      const savedPhotos = Array.isArray(memory?.photos)
        ? memory.photos
        : memory?.photo
          ? [memory.photo]
          : [];

      setPhotos(savedPhotos);
      setMessage('');
      setPage('writing');
    }

    // Support old single-photo memories and new multiple-photo memories
    const savedPhotos = Array.isArray(memory?.photos)
      ? memory.photos
      : memory?.photo
        ? [memory.photo]
        : [];

    setPhotos(savedPhotos);
    setMessage('');
    setPage('writing');
  }

  // UPLOAD MULTIPLE PHOTOS
  async function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const imageFiles = files.filter(file =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      setMessage('Please select image files.');
      event.target.value = '';
      return;
    }

    try {
      const compressedPhotos = await Promise.all(
        imageFiles.map(file => compressImage(file))
      );

      setPhotos(previous => [
        ...previous,
        ...compressedPhotos
      ]);

      setMessage(`${compressedPhotos.length} photo(s) added! ♡`);
    } catch {
      setMessage('Unable to upload photos. Please try again.');
    }

    event.target.value = '';
  }

  // REMOVE ONE PHOTO
  function removePhoto(indexToRemove) {
    setPhotos(previous =>
      previous.filter((_, index) => index !== indexToRemove)
    );

    setMessage('Photo removed.');
  }

  // MOVE TO PREVIOUS OR NEXT DATE
  function navigateDate(direction) {
    const date = new Date(`${selectedDate}T12:00:00`);

    date.setDate(date.getDate() + direction);

    const nextDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');

    openDate(nextDate);
  }

  // SAVE MEMORY
  function saveMemory() {
    const currentAccounts = getAccounts();

    if (!title.trim() && !thought.trim() && photos.length === 0) {
      setMessage('Write something or add a photo before saving.');
      return;
    }

    if (!currentAccounts[activeUser]) {
      setMessage('Please log in again.');
      return;
    }

    currentAccounts[activeUser].memories[selectedDate] = {
      title: title.trim(),
      thought,
      photos,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(currentAccounts)
      );

      setAccounts(currentAccounts);
      setMessage('Your memory has been saved! ♡');
    } catch {
      setMessage(
        'Storage is full. Remove some photos and try saving again.'
      );
    }
  }

  // CHANGE CALENDAR MONTH
  function changeMonth(amount) {
    const date = new Date(year, month + amount, 1);

    setMonth(date.getMonth());
    setYear(date.getFullYear());
  }

  // LOGOUT
  function logout() {
    setUsername('');
    setCode('');
    setConfirmCode('');
    setActiveUser('');
    setPage('welcome');
    setMessage('');
    setPhotos([]);
  }

  const memories = accounts[activeUser]?.memories || {};

  const memoryDates = Object.keys(memories)
    .sort()
    .reverse();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = new Date(year, month).toLocaleString('en', {
    month: 'long'
  });

  const today = new Date().toLocaleDateString('en-CA');

  const formattedDate = new Date(
    `${selectedDate}T12:00:00`
  ).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const totalMemories = Object.keys(memories).length;

  // WELCOME PAGE
  if (page === 'welcome') {
    return (
      <div className="welcome-page">
        <div className="welcome-card">
          <div className="welcome-icon">✿</div>

          <span className="eyebrow">
            YOUR PERSONAL MEMORY SPACE
          </span>

          <h1>Little Moments</h1>

          <p className="welcome-description">
            A little place for all the things you never want to forget.
            <br />
            Your thoughts, your stories, your memories.
          </p>

          <div className="welcome-decoration">
            ♡ &nbsp; ✧ &nbsp; ♡
          </div>

          <button
            onClick={() => {
              setPage('create');
              setMessage('');
            }}
          >
            Create My Diary <span>→</span>
          </button>

          <button
            className="back-button"
            onClick={() => {
              setPage('login');
              setMessage('');
            }}
          >
            I Already Have a Diary
          </button>

          <div className="welcome-footer">
            MADE WITH LOVE, JUST FOR YOU
          </div>
        </div>
      </div>
    );
  }

  // CREATE AND LOGIN
  if (page === 'create' || page === 'login') {
    const creating = page === 'create';

    return (
      <div className="welcome-page">
        <div className="welcome-card">
          <div className="welcome-icon">
            {creating ? '✿' : '♡'}
          </div>

          <span className="eyebrow">LITTLE MOMENTS</span>

          <h1>
            {creating ? 'Create Your Diary' : 'Welcome Back'}
          </h1>

          <p className="welcome-description">
            {creating
              ? 'Create your own little secret world.'
              : 'Your memories are waiting for you.'}
          </p>

          <input
            className="login-input"
            placeholder="Choose your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />

          <input
            className="login-input"
            type="password"
            placeholder="Your secret access code"
            value={code}
            onChange={e => setCode(e.target.value)}
          />

          {creating && (
            <input
              className="login-input"
              type="password"
              placeholder="Confirm your secret code"
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value)}
            />
          )}

          <button onClick={creating ? createDiary : login}>
            {creating ? 'Create My Diary ♡' : 'Open My Diary →'}
          </button>

          <button
            className="back-button"
            onClick={() => {
              setPage('welcome');
              setMessage('');
            }}
          >
            ← Go Back
          </button>

          {message && (
            <p className="saved-message">{message}</p>
          )}

          <div className="welcome-footer">
            YOUR MEMORIES, YOUR LITTLE WORLD
          </div>
        </div>
      </div>
    );
  }

  // CALENDAR DASHBOARD
  if (page === 'calendar') {
    return (
      <div className="calendar-page">
        <div className="dashboard-layout">

          <aside className="diary-sidebar">
            <div className="sidebar-brand">
              <span className="brand-symbol">✿</span>

              <div>
                <h2>Little Moments</h2>
                <small>MY PERSONAL DIARY</small>
              </div>
            </div>

            <div className="sidebar-profile">
              <div className="profile-avatar">
                {accounts[activeUser]?.username
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {accounts[activeUser]?.username}
                </strong>
                <small>Your little world</small>
              </div>
            </div>

            <div className="sidebar-label">MENU</div>

            <button className="sidebar-link active">
              <span>▦</span> My Calendar
            </button>

            <button
              className="sidebar-link"
              onClick={() => openDate(today)}
            >
              <span>✎</span> Write a Memory
            </button>

            <div className="sidebar-label">YOUR JOURNEY</div>

            <div className="sidebar-stat">
              <span className="stat-icon">♡</span>

              <div>
                <strong>{totalMemories}</strong>
                <small>Saved memories</small>
              </div>
            </div>

            <div className="sidebar-note">
              <span>“</span>

              <p>
                Collect moments, not things. Every little memory matters.
              </p>

              <small>YOUR LITTLE REMINDER</small>
            </div>

            <button
              className="sidebar-logout"
              onClick={logout}
            >
              ↪ &nbsp; Log out
            </button>
          </aside>

          <main className="dashboard-main">
            <header className="dashboard-header">
              <div>
                <span className="eyebrow">YOUR PRIVATE SPACE</span>

                <h1>
                  Hello, {accounts[activeUser]?.username}! ♡
                </h1>

                <p>
                  Take a moment to remember your beautiful days.
                </p>
              </div>

              <div className="header-date">
                <span>✧</span>

                {new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </header>

            <section className="dashboard-content">

              <div className="calendar-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      YOUR DAYS, YOUR STORIES
                    </span>

                    <h2>Memory Calendar</h2>

                    <p>
                      Choose a date to write or revisit a memory.
                    </p>
                  </div>

                  <button
                    className="today-button"
                    onClick={() => {
                      setMonth(new Date().getMonth());
                      setYear(new Date().getFullYear());
                    }}
                  >
                    Today
                  </button>
                </div>

                <div className="calendar-box">
                  <div className="calendar-heading">
                    <button onClick={() => changeMonth(-1)}>
                      ‹
                    </button>

                    <h3>{monthName} {year}</h3>

                    <button onClick={() => changeMonth(1)}>
                      ›
                    </button>
                  </div>

                  <div className="calendar-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div className="weekday" key={day}>
                        {day}
                      </div>
                    ))}

                    {Array.from({ length: firstDay }).map((_, index) => (
                      <div key={`empty-${index}`} />
                    ))}

                    {Array.from({ length: daysInMonth }, (_, index) => {
                      const day = index + 1;

                      const date = [
                        year,
                        String(month + 1).padStart(2, '0'),
                        String(day).padStart(2, '0')
                      ].join('-');

                      const hasMemory = Boolean(memories[date]);
                      const isToday = date === today;
                      const isSelected = selectedDate === date;

                      return (
                        <button
                          type="button"
                          key={date}
                          className={[
                            'calendar-day',
                            hasMemory ? 'has-memory' : '',
                            isToday ? 'today-day' : '',
                            isSelected ? 'selected-day' : ''
                          ].join(' ')}
                          onClick={() => openDate(date)}
                        >
                          {day}
                          {hasMemory && <span>♥</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="calendar-legend">
                    <span>♥</span> Saved memory
                    <span className="legend-today"></span> Today
                  </div>
                </div>

                <div className="memory-summary">
                  <div>
                    <span className="summary-icon">📖</span>

                    <div>
                      <strong>{totalMemories} memories</strong>
                      <small>Your story is growing beautifully.</small>
                    </div>
                  </div>

                  <button onClick={() => openDate(today)}>
                    + Write Today's Memory
                  </button>
                </div>
              </div>

              <aside className="recent-section">
                <div className="recent-heading">
                  <div>
                    <span className="eyebrow">LITTLE TREASURES</span>
                    <h2>Recent Memories</h2>
                  </div>

                  <span className="recent-heart">♡</span>
                </div>

                {memoryDates.length === 0 ? (
                  <div className="empty-memories">
                    <div>🌷</div>

                    <h3>Your story starts here</h3>

                    <p>
                      You haven't saved any memories yet.
                      Choose a date and write your first little story.
                    </p>

                    <button onClick={() => openDate(today)}>
                      Write a Memory
                    </button>
                  </div>
                ) : (
                  <div className="recent-list">
                    {memoryDates.slice(0, 8).map(date => (
                      <button
                        className="memory-item"
                        key={date}
                        onClick={() => openDate(date)}
                      >
                        <span className="memory-item-icon">♡</span>

                        <span className="memory-item-content">
                          <strong>
                            {memories[date].title || 'Untitled memory'}
                          </strong>

                          <small>
                            {new Date(`${date}T12:00:00`).toLocaleDateString(
                              'en-GB',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              }
                            )}
                          </small>
                        </span>

                        <span className="memory-arrow">›</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="recent-footer">
                  EVERY MEMORY IS A LITTLE TREASURE ♡
                </div>
              </aside>

            </section>

            <footer className="dashboard-footer">
              Made with love <span>♡</span> and little moments.
            </footer>
          </main>
        </div>
      </div>
    );
  }

  // DIARY WRITING PAGE
  if (page === 'writing') {
    return (
      <div className="diary-page">
        <div className="writing-layout">

          <header className="writing-header">
            <button
              className="writing-back"
              onClick={() => {
                setPage('calendar');
                setMessage('');
              }}
            >
              ← Back to Calendar
            </button>

            <div className="writing-brand">
              <span>✿</span> Little Moments
            </div>
          </header>

          <main className="diary-card">
            <div className="writing-decoration">
              ✧ &nbsp; ♡ &nbsp; ✧
            </div>

            <span className="eyebrow">
              A PAGE FROM YOUR LIFE
            </span>

            <h1>Dear Diary,</h1>

            <div className="date-navigation">
              <button
                className="date-arrow"
                onClick={() => navigateDate(-1)}
                title="Previous day"
              >
                ←
              </button>

              <p className="writing-date">{formattedDate}</p>

              <button
                className="date-arrow"
                onClick={() => navigateDate(1)}
                title="Next day"
              >
                →
              </button>
            </div>

            <div className="writing-divider">
              <div className="photo-upload-section">

                <label className="writing-label">
                  YOUR MEMORABLE PICTURES
                </label>

                <div className="photo-gallery">
                  {photos.map((photo, index) => (
                    <div
                      className="photo-gallery-item"
                      key={`${index}-${photo.slice(0, 30)}`}
                    >
                      <img
                        src={photo}
                        alt={`Memory ${index + 1}`}
                      />

                      <button
                        type="button"
                        className="remove-photo"
                        onClick={() => removePhoto(index)}
                        title="Remove this photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <label className="photo-upload-box">
                    <span>＋</span>
                    <strong>Add photos</strong>
                    <small>Select multiple pictures</small>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                <p className="photo-count">
                  {photos.length} photo(s) added to this memory
                </p>
              </div>

              <span>♡</span>
            </div>

            <label className="writing-label">
              GIVE THIS MEMORY A TITLE
            </label>

            <input
              className="login-input"
              placeholder="A beautiful day..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <label className="writing-label">
              YOUR THOUGHTS & FEELINGS
            </label>

            <textarea
              className="diary-writing"
              placeholder={`Dear diary,

Today was one of those days I want to remember forever...

Write your little moments here. ♡`}
              value={thought}
              onChange={e => setThought(e.target.value)}
            />

            <div className="writing-bottom">
              <span>Take your time. This page is yours. ♡</span>
              <span>{thought.length} characters</span>
            </div>

            <button
              className="save-memory-button"
              onClick={saveMemory}
            >
              Save This Memory ♡
            </button>

            {message && (
              <p className="saved-message">{message}</p>
            )}

            <div className="writing-footer">
              SOME MOMENTS DESERVE TO LAST FOREVER
            </div>
          </main>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
