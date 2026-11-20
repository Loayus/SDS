// Écran d'accueil au premier lancement + création du profil.
import { html, useState, useRef } from '../lib.js';
import { getData, commit, parseBackup, importBackup } from '../store.js';
import { Icon, toast, Stepper, navRoot } from '../ui.js';
import { LogoMark } from '../logo.js';
import { Body } from '../body.js';
import { parseNum } from '../utils.js';

export function Welcome() {
  const [step, setStep] = useState(0);
  const fileRef = useRef();

  const finish = (name, bw, weekly) => {
    const p = getData().profile;
    p.name = (name || '').trim() || 'Athlète';
    const w = parseNum(bw);
    if (w && w > 20 && w < 400) p.bodyWeight = w;
    p.goal = { ...p.goal, type: 'weekly', weekly };
    p.onboarded = true;
    commit();
    navRoot('/');
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      importBackup(parseBackup(await f.text()));
      toast('Sauvegarde restaurée');
      navRoot('/');
    } catch (err) {
      toast(err.message, { icon: 'info', duration: 3500 });
    }
  };

  if (step === 1) return html`<${ProfileForm} onDone=${finish} onBack=${() => setStep(0)} />`;

  return html`<div class="welcome">
    <div class="welcome-art" aria-hidden="true">
      <div class="welcome-glow"></div>
      <${Body} side="back" levels=${{ back: 1, shoulders: 0.85, traps: 0.7, triceps: 0.6, lowerback: 0.4, glutes: 0.3 }} gap="#050506" class="welcome-body" />
    </div>
    <div class="welcome-content">
      <div class="welcome-brand">
        <${LogoMark} size=${92} glow />
        <div class="welcome-word">S D S</div>
        <p>Enregistrez. Progressez. Dépassez-vous.</p>
      </div>
      <div class="welcome-actions">
        <button class="btn btn-light" onClick=${() => setStep(1)}>Créer mon profil</button>
        <button class="btn btn-outline" onClick=${() => fileRef.current.click()}>Restaurer une sauvegarde</button>
        <button class="link-btn" onClick=${() => finish('Athlète', null, 3)}>Continuer en tant qu'invité</button>
      </div>
      <input ref=${fileRef} type="file" accept="application/json,.json" hidden onChange=${onFile} />
    </div>
  </div>`;
}

function ProfileForm({ onDone, onBack }) {
  const [name, setName] = useState('');
  const [bw, setBw] = useState('');
  const [weekly, setWeekly] = useState(3);
  return html`<div class="app"><div class="page onboarding">
    <header class="topbar">
      <div class="topbar-side">
        <button class="icon-btn" aria-label="Retour" onClick=${onBack}><${Icon} name="arrow-left" size=${24} /></button>
      </div>
      <div class="topbar-title"></div>
      <div class="topbar-side"></div>
    </header>
    <form
      class="onboarding-form"
      onSubmit=${(e) => {
        e.preventDefault();
        onDone(name, bw, weekly);
      }}
    >
      <${LogoMark} size=${56} />
      <h1>Bienvenue 💪</h1>
      <p class="muted">Quelques infos pour personnaliser SDS. Tout reste sur ton téléphone.</p>

      <label class="form-label" for="ob-name">Ton prénom ou pseudo</label>
      <input id="ob-name" class="field" type="text" placeholder="Athlète" value=${name} onInput=${(e) => setName(e.target.value)} autocomplete="given-name" />

      <label class="form-label" for="ob-bw">Poids de corps <span class="muted">(pour estimer les calories)</span></label>
      <div class="field-wrap">
        <input id="ob-bw" class="field" type="text" inputmode="decimal" placeholder="75" value=${bw} onInput=${(e) => setBw(e.target.value)} />
        <span class="field-suffix">kg</span>
      </div>

      <label class="form-label">Objectif de séances par semaine</label>
      <div class="card row-between">
        <span>${weekly} séance${weekly > 1 ? 's' : ''} / semaine</span>
        <${Stepper} value=${weekly} min=${1} max=${7} onChange=${setWeekly} label="Objectif hebdomadaire" />
      </div>

      <button type="submit" class="btn btn-light btn-block">C'est parti</button>
    </form>
  </div></div>`;
}
