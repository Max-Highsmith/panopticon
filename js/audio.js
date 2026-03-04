/* ===================================================================
   PANOPTICON — Background Music Player
   =================================================================== */

import { formatTime, $ } from './utils.js';

let audioPlaying = false;

export function initAudioPlayer() {
  const music = $('bg-music');
  music.volume = 0.4;

  music.addEventListener('timeupdate', () => {
    if (!music.duration) return;
    const pct = (music.currentTime / music.duration) * 100;
    $('ap-progress').style.width = pct + '%';
    $('ap-time').textContent = formatTime(music.currentTime) + ' / ' + formatTime(music.duration);
  });

  $('ap-progress-wrap').addEventListener('click', (e) => {
    if (!music.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    music.currentTime = pct * music.duration;
  });
}

export function toggleAudio() {
  const music = $('bg-music');
  if (music.paused) {
    music.play();
    audioPlaying = true;
    $('ap-play-btn').innerHTML = '&#9646;&#9646;';
  } else {
    music.pause();
    audioPlaying = false;
    $('ap-play-btn').innerHTML = '&#9654;';
  }
}
