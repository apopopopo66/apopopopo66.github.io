(() => {
  "use strict";
  const data = window.TRAVEL_VOTE_DATA;
  const config = window.TRAVEL_VOTE_CONFIG || {};
  const state = { ratings: {}, votes: [], client: null, demo: true };
  const $ = (s) => document.querySelector(s);
  const list = $("#candidate-list");
  const nameInput = $("#voter-name");
  const saveStatus = $("#save-status");
  const modeMessage = $("#mode-message");
  const storageKey = `travel-vote:name:${data.tripSlug}`;

  function configured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes("YOUR_PROJECT"));
  }
  function setStatus(el, text, type = "") {
    el.textContent = text;
    el.className = `status${type ? ` is-${type}` : ""}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
  function renderCandidates() {
    list.innerHTML = "";
    data.candidates.forEach((item) => {
      const fragment = $("#candidate-template").content.cloneNode(true);
      const card = fragment.querySelector(".stay-card");
      card.dataset.id = item.id;
      fragment.querySelector(".stay-card__area").textContent = item.area;
      fragment.querySelector(".stay-card__name").textContent = item.name;
      fragment.querySelector(".stay-card__summary").textContent = item.summary;
      const image = fragment.querySelector(".stay-card__image");
      if (item.imageUrl) { image.style.backgroundImage = `linear-gradient(rgba(20,35,29,.12),rgba(20,35,29,.3)),url("${item.imageUrl.replace(/"/g, "%22")}")`; image.querySelector("span").hidden = true; }
      const facts = fragment.querySelector(".facts");
      [["5人料金",item.priceTotal],["1人目安",item.pricePerPerson],["サウナ",item.sauna],["BBQ",item.bbq],["鋸山",item.access]].forEach(([k,v]) => facts.insertAdjacentHTML("beforeend", `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`));
      const stars = fragment.querySelector(".stars");
      for (let score = 1; score <= 5; score += 1) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "star"; button.textContent = "★";
        button.setAttribute("role", "radio"); button.setAttribute("aria-label", `${score}点`); button.setAttribute("aria-checked", "false");
        button.addEventListener("click", () => { state.ratings[item.id] = score; updateCardRating(card); });
        stars.appendChild(button);
      }
      fragment.querySelector(".clear-rating").addEventListener("click", () => { delete state.ratings[item.id]; updateCardRating(card); });
      const link = fragment.querySelector(".official-link");
      if (item.url) link.href = item.url; else link.hidden = true;
      list.appendChild(fragment);
    });
  }
  function updateCardRating(card) {
    const score = state.ratings[card.dataset.id];
    card.querySelector(".rating-value").textContent = score ? `${score} / 5` : "未評価";
    [...card.querySelectorAll(".star")].forEach((star, i) => {
      const active = Boolean(score && i < score);
      star.classList.toggle("is-active", active);
      star.setAttribute("aria-checked", String(score === i + 1));
    });
  }
  function updateAllCards() { document.querySelectorAll(".stay-card").forEach(updateCardRating); }
  async function loadOwnRatings() {
    const voter = nameInput.value.trim();
    state.ratings = {};
    if (!voter || state.demo) { updateAllCards(); return; }
    const { data: rows, error } = await state.client.from("votes").select("accommodation_id,score").eq("trip_slug", data.tripSlug).eq("voter_name", voter);
    if (error) { setStatus(saveStatus, `自分の評価を読み込めませんでした: ${error.message}`, "error"); return; }
    rows.forEach((row) => { state.ratings[row.accommodation_id] = row.score; });
    updateAllCards();
  }
  async function loadResults() {
    if (state.demo) { renderResults([]); return; }
    const { data: rows, error } = await state.client.from("votes").select("voter_name,accommodation_id,score").eq("trip_slug", data.tripSlug);
    if (error) { $("#results-list").innerHTML = `<p class="empty">集計を取得できませんでした。${escapeHtml(error.message)}</p>`; return; }
    state.votes = rows; renderResults(rows);
  }
  function renderResults(rows) {
    const resultList = $("#results-list");
    if (!rows.length) {
      resultList.innerHTML = `<p class="empty">${state.demo ? "Supabase設定後に、みんなの集計がここに表示されます。" : "まだ評価がありません。最初の1票をどうぞ。"}</p>`;
      $("#matrix-wrap").innerHTML = ""; return;
    }
    const aggregates = data.candidates.map((c) => {
      const scores = rows.filter((r) => r.accommodation_id === c.id).map((r) => r.score);
      return { candidate: c, count: scores.length, avg: scores.length ? scores.reduce((a,b) => a+b,0) / scores.length : 0 };
    }).sort((a,b) => b.avg-a.avg || b.count-a.count);
    const topAvg = aggregates[0].avg;
    resultList.innerHTML = aggregates.map((r) => `<article class="result-row${r.avg === topAvg && r.count ? " is-top" : ""}"><div class="result-row__top"><h3>${escapeHtml(r.candidate.name)}</h3><span class="result-score">${r.count ? `${r.avg.toFixed(1)} ★` : "—"}</span></div><div class="result-meta">${r.count}人が評価${r.avg === topAvg && r.count ? " ・ 現在トップ" : ""}</div></article>`).join("");
    renderMatrix(rows);
  }
  function renderMatrix(rows) {
    const voters = [...new Set(rows.map((r) => r.voter_name))].sort((a,b) => a.localeCompare(b,"ja"));
    const short = (name) => name.length > 9 ? `${name.slice(0,8)}…` : name;
    let html = `<table class="matrix"><thead><tr><th>メンバー</th>${data.candidates.map((c) => `<th>${escapeHtml(short(c.name))}</th>`).join("")}</tr></thead><tbody>`;
    voters.forEach((voter) => { html += `<tr><td>${escapeHtml(voter)}</td>${data.candidates.map((c) => { const hit = rows.find((r) => r.voter_name === voter && r.accommodation_id === c.id); return `<td>${hit ? `${hit.score}★` : "—"}</td>`; }).join("")}</tr>`; });
    $("#matrix-wrap").innerHTML = `${html}</tbody></table>`;
  }
  async function saveRatings() {
    const voter = nameInput.value.trim();
    if (!voter) { nameInput.focus(); setStatus(saveStatus, "先に名前を入力してください。", "error"); return; }
    localStorage.setItem(storageKey, voter);
    if (state.demo) { setStatus(saveStatus, "デモ表示中です。Supabaseを設定するとみんなで保存できます。", "error"); return; }
    const rows = Object.entries(state.ratings).map(([accommodation_id, score]) => ({ trip_slug: data.tripSlug, voter_name: voter, accommodation_id, score, updated_at: new Date().toISOString() }));
    const existing = state.votes.filter((v) => v.voter_name === voter).map((v) => v.accommodation_id);
    const removed = existing.filter((id) => !state.ratings[id]);
    setStatus(saveStatus, "保存中…");
    if (rows.length) {
      const { error } = await state.client.from("votes").upsert(rows, { onConflict: "trip_slug,voter_name,accommodation_id" });
      if (error) { setStatus(saveStatus, `保存できませんでした: ${error.message}`, "error"); return; }
    }
    if (removed.length) {
      const { error } = await state.client.from("votes").delete().eq("trip_slug", data.tripSlug).eq("voter_name", voter).in("accommodation_id", removed);
      if (error) { setStatus(saveStatus, `評価解除の保存に失敗しました: ${error.message}`, "error"); return; }
    }
    setStatus(saveStatus, "保存しました。みんなの集計も更新しました。", "success");
    await loadResults();
  }
  async function share() {
    const payload = { title: data.title, text: `${data.title}の宿を評価してね！`, url: location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(location.href); alert("URLをコピーしました。LINEに貼り付けて共有してください。"); }
    } catch (error) { if (error.name !== "AbortError") setStatus(modeMessage, "共有できませんでした。URLをコピーしてLINEに貼り付けてください。", "error"); }
  }
  async function init() {
    $("#page-title").textContent = data.title; $("#page-subtitle").textContent = data.subtitle;
    renderCandidates(); nameInput.value = localStorage.getItem(storageKey) || "";
    if (configured() && window.supabase) {
      state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey); state.demo = false;
      setStatus(modeMessage, "名前はこの端末に保存されます。");
      await loadOwnRatings(); await loadResults();
    } else {
      setStatus(modeMessage, "現在はデモ表示です。Supabase設定後に共同投票が有効になります。"); renderResults([]);
    }
    $("#save-button").addEventListener("click", saveRatings);
    $("#refresh-button").addEventListener("click", loadResults);
    $("#share-button").addEventListener("click", share);
    let timer; nameInput.addEventListener("input", () => { localStorage.setItem(storageKey, nameInput.value.trim()); clearTimeout(timer); timer = setTimeout(loadOwnRatings, 450); });
  }
  init().catch((error) => { console.error(error); setStatus(modeMessage, "初期化に失敗しました。ページを再読み込みしてください。", "error"); });
})();
