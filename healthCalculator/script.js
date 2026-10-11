(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("calc-form");
  const ageEl = $("age");
  const weightEl = $("weight");
  const cmEl = $("height-cm");
  const ftEl = $("height-ft");
  const inEl = $("height-in");

  const LB_PER_KG = 2.20462;
  const CM_PER_IN = 2.54;
  const DAILY_DELTA = 500; // ~0.45 kg (1 lb) per week
  const MIN_KCAL = { male: 1500, female: 1200 };

  const getUnits = () => document.querySelector('input[name="units"]:checked').value;
  const getGender = () => document.querySelector('input[name="gender"]:checked').value;
  const getActivity = () => parseFloat(document.querySelector('input[name="activity"]:checked').value);

  /* ---------- Unit switching ---------- */
  function applyUnits() {
    const imperial = getUnits() === "imperial";
    $("height-metric").classList.toggle("hidden", imperial);
    $("height-imperial").classList.toggle("hidden", !imperial);
    $("height-unit").textContent = imperial ? "ft / in" : "cm";
    $("weight-unit").textContent = imperial ? "lb" : "kg";
    weightEl.placeholder = imperial ? "e.g. 154" : "e.g. 70";
    weightEl.min = imperial ? 66 : 30;
    weightEl.max = imperial ? 660 : 300;
    clearErrors();
  }

  document.querySelectorAll('input[name="units"]').forEach((r) =>
    r.addEventListener("change", () => {
      convertEnteredValues(getUnits());
      applyUnits();
    })
  );

  // Convert whatever is typed so values carry across when toggling units
  function convertEnteredValues(toUnits) {
    const w = parseFloat(weightEl.value);
    if (!isNaN(w)) {
      weightEl.value = toUnits === "imperial" ? round1(w * LB_PER_KG) : round1(w / LB_PER_KG);
    }
    if (toUnits === "imperial") {
      const cm = parseFloat(cmEl.value);
      if (!isNaN(cm)) {
        const totalIn = cm / CM_PER_IN;
        let ft = Math.floor(totalIn / 12);
        let inch = round1(totalIn - ft * 12);
        if (inch >= 12) { ft += 1; inch = 0; }
        ftEl.value = ft;
        inEl.value = inch;
      }
    } else {
      const ft = parseFloat(ftEl.value);
      const inch = parseFloat(inEl.value) || 0;
      if (!isNaN(ft)) cmEl.value = Math.round((ft * 12 + inch) * CM_PER_IN);
    }
  }

  const round1 = (n) => Math.round(n * 10) / 10;

  /* ---------- Validation ---------- */
  function setError(inputs, id, msg) {
    $(id).textContent = msg;
    [].concat(inputs).forEach((i) => i.classList.add("invalid"));
  }

  function clearErrors() {
    document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
    document.querySelectorAll("input.invalid").forEach((i) => i.classList.remove("invalid"));
  }

  function readInputs() {
    clearErrors();
    const imperial = getUnits() === "imperial";
    let ok = true;

    const age = parseFloat(ageEl.value);
    if (isNaN(age) || age < 15 || age > 100) {
      setError(ageEl, "err-age", "Enter an age between 15 and 100.");
      ok = false;
    }

    let heightCm;
    if (imperial) {
      const ft = parseFloat(ftEl.value);
      const inch = parseFloat(inEl.value) || 0;
      if (isNaN(ft) || ft < 3 || ft > 8 || inch < 0 || inch >= 12) {
        setError([ftEl, inEl], "err-height", "Enter a height between 3 ft and 8 ft 11 in.");
        ok = false;
      } else {
        heightCm = (ft * 12 + inch) * CM_PER_IN;
      }
    } else {
      heightCm = parseFloat(cmEl.value);
      if (isNaN(heightCm) || heightCm < 100 || heightCm > 250) {
        setError(cmEl, "err-height", "Enter a height between 100 and 250 cm.");
        ok = false;
      }
    }

    let weightKg = parseFloat(weightEl.value);
    if (!isNaN(weightKg) && imperial) weightKg = weightKg / LB_PER_KG;
    if (isNaN(weightKg) || weightKg < 30 || weightKg > 300) {
      setError(weightEl, "err-weight", imperial ? "Enter a weight between 66 and 660 lb." : "Enter a weight between 30 and 300 kg.");
      ok = false;
    }

    return ok ? { age, heightCm, weightKg, gender: getGender(), activity: getActivity() } : null;
  }

  /* ---------- Calculations ---------- */
  // Mifflin-St Jeor equation
  function calcBMR({ gender, weightKg, heightCm, age }) {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : -161);
  }

  function bmiCategory(bmi) {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Healthy range";
    if (bmi < 30) return "Overweight";
    return "Obese range";
  }

  /* ---------- Rendering ---------- */
  function animateNumber(el, to, duration = 700) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = to.toLocaleString();
      return;
    }
    const start = performance.now();
    const from = parseInt(el.textContent.replace(/\D/g, ""), 10) || 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function render(data) {
    const bmr = calcBMR(data);
    const tdee = bmr * data.activity;
    const bmi = data.weightKg / Math.pow(data.heightCm / 100, 2);

    const maintain = Math.round(tdee);
    let lose = Math.round(tdee - DAILY_DELTA);
    const gain = Math.round(tdee + DAILY_DELTA);

    const floor = MIN_KCAL[data.gender];
    const loseNote = $("lose-note");
    if (lose < floor) {
      lose = floor;
      loseNote.textContent = `Raised to ${floor.toLocaleString()} kcal, a commonly recommended minimum without medical supervision.`;
      loseNote.classList.remove("hidden");
    } else {
      loseNote.classList.add("hidden");
    }

    $("placeholder").classList.add("hidden");
    const out = $("output");
    out.classList.remove("hidden");
    // restart entrance animation
    out.style.animation = "none"; void out.offsetWidth; out.style.animation = "";

    animateNumber($("maintain"), maintain);
    animateNumber($("lose"), lose);
    animateNumber($("gain"), gain);
    $("bmr").textContent = Math.round(bmr).toLocaleString();
    $("bmi").textContent = bmi.toFixed(1);
    $("bmi-cat").textContent = bmiCategory(bmi);

    if (window.matchMedia("(max-width: 860px)").matches) {
      $("results").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- Events ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readInputs();
    if (data) render(data);
  });

  $("reset-btn").addEventListener("click", () => {
    form.reset();
    applyUnits();
    $("output").classList.add("hidden");
    $("placeholder").classList.remove("hidden");
  });

  [ageEl, weightEl, cmEl, ftEl, inEl].forEach((el) =>
    el.addEventListener("input", () => el.classList.remove("invalid"))
  );

  applyUnits();
})();
