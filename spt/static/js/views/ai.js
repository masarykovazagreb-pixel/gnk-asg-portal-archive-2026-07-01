// SPT — AI asistent (chat)
"use strict";
VIEWS.ai = {
  title: "SPT AI asistent",
  sub: "Pitaj o bazi, sportašima, normama, rizicima — asistent poznaje cijelu SPT bazu",
  render(cont) {
    cont.innerHTML = "";
    const card = el("div", "card");
    card.innerHTML = `<h3>🤖 SPT AI <span class="badge b-cyan" id="aiEngine">lokalni motor</span></h3>`;
    const chat = el("div", "chat-box");
    const form = el("div", "chat-input");
    const input = el("input"); input.type = "text";
    input.placeholder = I18N.t.ask_ai || "Pitaj SPT AI...";
    const send = el("div", "btn", "➤");
    form.append(input, send);
    card.append(chat, el("hr", "sep"), form);

    // prijedlozi
    const sug = el("div", "pill-row");
    const suggestions = [
      "pomoć", "tko je najbrži u nogometu?", "anomalije", "što je ACWR?",
      "usporedi Sarah Wagner i Paul Becker", "top po opterećenju u košarci",
      "rizik za Sarah Wagner", "ozljede u KLB-BTRQ"
    ];
    for (const s of suggestions) {
      const c = el("div", "chip chip-suggest", s);
      c.onclick = () => { input.value = s; submit(); };
      sug.append(c);
    }
    card.append(sug);
    cont.append(card);

    function md(t) {
      return esc(t)
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.+?)\*/g, "<i>$1</i>")
        .replace(/_(.+?)_/g, "<i>$1</i>");
    }
    function addMsg(text, who) {
      const m = el("div", `chat-msg ${who}`, md(text));
      chat.append(m);
      chat.scrollTop = chat.scrollHeight;
      return m;
    }
    async function submit() {
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      addMsg(q, "user");
      const bot = addMsg("…", "bot");
      try {
        const r = await API.post("/api/ai/chat", { message: q, lang: I18N.lang });
        bot.innerHTML = md(r.reply);
        if (r.engine) {
          const eng = document.getElementById("aiEngine");
          if (eng) eng.textContent = r.engine;
        }
      } catch (e) {
        bot.textContent = "Greška: " + e;
      }
      chat.scrollTop = chat.scrollHeight;
    }
    send.onclick = submit;
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });

    addMsg("Zdravo! Ja sam **SPT AI** 🤖 — mogu pretraživati cijelu bazu, uspoređivati sportaše, tumačiti metrike i procjenjivati rizik ozljede.\nUpiši **pomoć** za popis mogućnosti ili klikni prijedlog ispod.\n— · · · —\n*SPT · produced by GNK ASG*", "bot");
    input.focus();
  }
};
