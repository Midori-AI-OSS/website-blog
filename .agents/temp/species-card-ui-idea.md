import React, { useEffect, useMemo, useState } from "react";
import { Download, Maximize2, Minimize2, RotateCcw, ScanLine, ShieldAlert, Users } from "lucide-react";

const CARD_W = 534;
const CARD_H = 336;
const EXPORT_SCALE = 3;

const sharedLuminumbra = {
  designation: "Luminumbra Aasimar-touched",
  profileId: "Luminumbra Aasimar-touched / AAS-TCH-LUMINUMBRA-PROV",
  version: "PROV v0.12",
  primaryFlag: "Pain may understate injury severity; halo/eye glow flags pain-reflex power activity; assess structure/function first and use lower-start medication protocol.",
  pain: "Lenimen Caelesta is an involuntary, self-only pain-softening reflex. It does not heal, stabilize, stop bleeding, restore strength, or bypass structural limits.",
  meds: "Broad medication sensitivity. Use lower-start dosing and titration where clinically appropriate. Do not frame this as higher metabolism.",
  magic: "Halo and eye glow are known signs of active power or magic use. Do not treat halo/eye glow by itself as staff danger.",
};

const patients = {
  luna: {
    key: "luna",
    initials: "LM",
    legalName: "Luna Midori",
    preferredName: "Luna Midori",
    pronouns: "she/her",
    dobAge: "01/21 - late 20s",
    sex: "Female",
    gender: "Female",
    species: "Luminumbra Aasimar-touched",
    profileId: "AAS-TCH-LUMINUMBRA-PROV",
    version: "PROV v0.15",
    subtype: "Provisional",
    identityCaution: "Verify by card/name. Outfit is not diagnostic.",
    flag: "Pain may understate injury severity. Halo/eye glow may flag pain-reflex power activity.",
    issuedBy: "High school screening",
    registeredWith: "DHS Care Registry",
    replacement: "DHS Care Registry lookup",
    healthcareId: "MRN-AR-SAPPORO-MIDORI-LUNA-0121",
    ehr: "DHS Care Registry",
    emergency: "Midori family - registry contact record",
    advocate: "Contact Leo Midori when clinically relevant for linked-pair context",
    lookup: "DHS-AR-SAPPORO-MIDORI-LUNA-0121-AAS-TCH-LUMINUMBRA-PROV",
    qr: "rm-health://species-card/ar/sapporo/midori/luna/0121/aas-tch-luminumbra-prov",
    nfc: "Active",
    updated: "Not documented",
    recordType: "Species-level care guidance with Luna-specific clinical notes",
    signature: "Not documented in current card record",
    banner: "Pain may understate injury severity. Assess structure and function before trusting reported pain.",
    back: {
      escalate: "Low pain + reduced/failed mobility, collapse, inability to stand/walk/use a limb, or sudden function loss.",
      doNotDismiss: "Do not rely on 'I'm fine' when function, mechanism, or magic signs are concerning.",
      firstAction: "Ask function questions. Assess structure/function first. Check halo, eye glow, and magic state.",
      hardAvoids: "Do not treat low pain as proof of low injury severity. Do not skip imaging when function/mechanism indicates concern.",
      meds: "Use lower-start dosing and titration where appropriate. Normal doses may hit harder.",
      sedation: "Analgesia may be less reliable during pain-reflex activity. Do not escalate only to force pain report to match injury.",
      labs: "Human baseline. No special sample handling documented unless EHR says otherwise.",
      imaging: "Image by mechanism, function loss, deformity, neurovascular concern, or suspected structural injury regardless of pain score.",
      sensory: "Human baseline. Explain clinical movement and assessment plainly.",
      handling: "Move/stabilize as human with suspected injury. Pain reflex does not restore strength or bypass structural injury.",
      unknowns: "Subtype provisional. No Luna-specific allergies documented in this card record.",
    },
    fullRecordSections: [
      {
        title: "Quick Red Flags",
        items: [
          ["Immediate escalation signs", "Mismatch between low reported pain and reduced or failed mobility, collapse, inability to stand or walk, inability to use a limb, or sudden function loss."],
          ["Do not dismiss as normal", "Do not rely on 'I'm fine' when function, mechanism, or magic signs are concerning."],
          ["Fastest safe response", "Ask function questions, assess structure/function first, check halo/eye changes and magic state, and use the shared Luminumbra care profile."],
        ],
      },
      {
        title: "Pain / Medication / Sedation",
        items: [
          ["Pain expression", "Pain may be softened by Lenimen Caelesta and feel lower because that is normal for Luna."],
          ["Dosing considerations", "Use lower-start dosing and titration where clinically appropriate. Broad medication sensitivity; normal doses may hit harder."],
          ["Analgesia note", "Analgesia may be less reliable than other drug effects while the pain-reflex power is active."],
          ["Anesthesia caution", "Do not keep escalating medication solely to force pain report to match injury concern."],
        ],
      },
      {
        title: "Imaging / Wounds / Mobility",
        items: [
          ["Imaging priority", "Image based on mechanism, function loss, deformity, neurovascular concern, or suspected structural injury regardless of pain score."],
          ["Wounds / healing", "The pain reflex does not heal, stabilize, stop bleeding, restore strength, or bypass structural injury."],
          ["Safe movement", "Stabilize and move as for a human patient with the suspected injury. Treat reduced mobility with low reported pain as clinically important."],
        ],
      },
      {
        title: "Communication / Linked Pair / Unknowns",
        items: [
          ["Reliable communication", "Normal communication; use English or Celestial as available."],
          ["Linked-pair note", "Contact Leo Midori through the registry when linked-pair context is clinically relevant."],
          ["Known unknowns", "Subtype provisional. No Luna-specific allergies documented in this card record."],
        ],
      },
    ],
  },
  leo: {
    key: "leo",
    initials: "LM",
    legalName: "Leo Midori",
    preferredName: "Leo Midori",
    pronouns: "he/him",
    dobAge: "01/21 - late 20s",
    sex: "Male",
    gender: "Male",
    species: "Luminumbra Aasimar-touched",
    profileId: "AAS-TCH-LUMINUMBRA-PROV",
    version: "PROV v0.15",
    subtype: "Provisional",
    identityCaution: "Verify by card/name. Outfit is not diagnostic.",
    flag: "Pain may understate injury severity. Halo/eye glow may flag pain-reflex power activity.",
    issuedBy: "High school screening",
    registeredWith: "DHS Care Registry",
    replacement: "DHS Care Registry lookup",
    healthcareId: "MRN-AR-SAPPORO-MIDORI-LEO-0121",
    ehr: "DHS Care Registry",
    emergency: "Midori family - registry contact record",
    advocate: "Contact Luna Midori when Leo is badly injured, depleted, or magic-unstable",
    lookup: "DHS-AR-SAPPORO-MIDORI-LEO-0121-AAS-TCH-LUMINUMBRA-PROV",
    qr: "rm-health://species-card/ar/sapporo/midori/leo/0121/aas-tch-luminumbra-prov",
    nfc: "Active",
    updated: "Not documented",
    recordType: "Species-level care guidance with Leo-specific clinical notes",
    signature: "Not documented in current card record",
    banner: "Collapse, fainting, inability to stay upright, or unusual alertness changes should escalate even after fast rebound.",
    back: {
      escalate: "Actual collapse, fainting, inability to stay upright, inability to stand/walk, or unusual alertness/orientation changes.",
      doNotDismiss: "Fast rebound after heavy magical bursts does not prove physical injury is safe.",
      firstAction: "Assess structure/function first. Check halo, eye glow, magic state, and use shared Luminumbra care profile.",
      hardAvoids: "Do not trust low pain as proof of low injury severity. Do not ignore imaging because function seems better than expected.",
      meds: "Use lower-start dosing and titration where appropriate. Normal doses may hit harder.",
      sedation: "Analgesia may be less reliable during pain-reflex activity. Do not escalate only to force pain report to match injury.",
      labs: "Human baseline. No special sample handling documented unless EHR says otherwise.",
      imaging: "Image by mechanism, function loss, deformity, neurovascular concern, or suspected structural injury regardless of pain score.",
      sensory: "Human baseline. Explain clinical movement and assessment plainly.",
      handling: "Watch collapse, fainting, inability to stay upright, walk, or stand. Body limits still apply.",
      unknowns: "Subtype provisional. No Leo-specific allergies documented in this card record.",
    },
    fullRecordSections: [
      {
        title: "Quick Red Flags",
        items: [
          ["Immediate escalation signs", "Actual collapse, fainting, inability to stay upright, inability to stand or walk, or unusual inability to stay alert/oriented."],
          ["Do not dismiss as normal", "Leo may rebound faster than expected after heavy magical bursts and related temporary mobility problems; do not treat that as proof physical injury is safe."],
          ["Fastest safe response", "Assess structure/function first, check halo/eye changes and magic state, and use the shared Luminumbra care profile."],
        ],
      },
      {
        title: "Pain / Medication / Sedation",
        items: [
          ["Pain expression", "Pain may be softened by Lenimen Caelesta."],
          ["Dosing considerations", "Use lower-start dosing and titration where clinically appropriate. Broad medication sensitivity; normal doses may hit harder."],
          ["Analgesia note", "Analgesia may be less reliable than other drug effects while the pain-reflex power is active."],
          ["Anesthesia caution", "Do not keep escalating medication solely to force pain report to match injury concern."],
        ],
      },
      {
        title: "Imaging / Wounds / Mobility",
        items: [
          ["Imaging priority", "Image based on mechanism, function loss, deformity, neurovascular concern, or suspected structural injury regardless of pain score."],
          ["Wounds / healing", "The pain reflex does not heal, stabilize, stop bleeding, restore strength, or bypass structural injury."],
          ["Safe movement", "Stabilize and move as for a human patient with the suspected injury. Treat collapse, weakness, or inability to stay upright as clinically important."],
        ],
      },
      {
        title: "Communication / Magic / Linked Pair",
        items: [
          ["Reliable communication", "Normal communication; use English, Celestial, or Abyssal as available."],
          ["Linked-pair note", "Contact Luna Midori through the registry when linked-pair context is clinically relevant."],
          ["Darkness-primary visual", "Darkness magic can look like smoke-like shadow. This visual alone is not smoke, fire, infection, or staff danger."],
        ],
      },
    ],
  },
  echo: {
    key: "echo",
    initials: "EP",
    legalName: "Echo Poindexter",
    preferredName: "Echo Poindexter",
    pronouns: "she/her",
    dobAge: "10/03 - late 20s",
    sex: "Female",
    gender: "Female",
    species: "Human (magic-touched)",
    profileId: "HUM-MG-TCH / ECHO-PROV",
    version: "PROV v0.15",
    subtype: "Provisional",
    identityCaution: "Verify DOB by record, not appearance.",
    flag: "Verify DOB by record, not appearance. Healing may progress unusually fast; early visible improvement does not prove minor injury.",
    issuedBy: "High school screening",
    registeredWith: "DHS Care Registry - Farmington / AR",
    replacement: "DHS Care Registry lookup",
    healthcareId: "MRN-AR-FARMINGTON-POINDEXTER-ECHO-1003",
    ehr: "DHS Care Registry",
    emergency: "James - registry contact record",
    advocate: "Trusted person may assist during overload; see linked support note",
    lookup: "DHS-AR-FARMINGTON-POINDEXTER-ECHO-1003-HUM-MG-TCH-ECHO-PROV",
    qr: "rm-health://species-card/ar/farmington/poindexter/echo/1003/hum-mg-tch/echo-prov",
    nfc: "Active",
    updated: "Update after medication/anesthesia encounters",
    recordType: "Species-level care guidance with Echo-specific clinical notes",
    signature: "Signed by Echo",
    banner: "Use records for DOB and baseline age. Reduce sensory load during abrupt waking, overload, or fragmented answers.",
    back: {
      escalate: "Abrupt/early emergence, post-crisis waking with panic, missing history, or inability to give coherent intake.",
      doNotDismiss: "Apparent age/body read may not match DOB. Early visible healing does not prove injury was minor.",
      firstAction: "Reduce sensory load. Use one speaker. Orient with short concrete facts. Announce touch.",
      hardAvoids: "Do not infer DOB, developmental status, or baseline age from appearance. Do not crowd or rapid-fire questions.",
      meds: "Effects may wear off sooner than expected across most categories. Reassess sooner.",
      sedation: "Can go under fast and wake earlier than expected. Use emergence support steps immediately.",
      labs: "Human baseline unless patient-specific EHR says otherwise.",
      imaging: "Use ordinary mechanism, exam, and function concerns. Apparent age/body read is not a reliable age marker.",
      sensory: "Reduce bright light/noise. Use one speaker. Avoid crowding and announce touch before contact.",
      handling: "Explain movement in short concrete terms. Protect lines gently during abrupt waking or overload.",
      unknowns: "Echo-specific allergies and patient-specific anesthesia agent history not documented.",
    },
    fullRecordSections: [
      {
        title: "Quick Red Flags",
        items: [
          ["Immediate escalation signs", "Abrupt or early emergence from sedation/anesthesia, post-crisis or medical waking with panic/fragmented response, missing history, or inability to give coherent intake."],
          ["Do not dismiss as normal", "Apparent age/body read may not match DOB, and early visible healing does not prove injury was minor."],
          ["Fastest safe response", "Reduce sensory load, use one speaker, orient with short concrete facts, announce touch, and let a trusted person help if available."],
        ],
      },
      {
        title: "Medication / Sedation / Emergence",
        items: [
          ["Medication duration", "Across most medication categories, effects may wear off sooner than expected; reassess sooner."],
          ["Sedation response", "Echo can go under fast and wake earlier than staff may expect."],
          ["Anesthesia caution", "Abrupt, post-crisis, or medical waking is high risk; use emergence support steps immediately."],
        ],
      },
      {
        title: "Age Read / Healing / Injury Assessment",
        items: [
          ["Clinical age note", "Do not use appearance to infer DOB, developmental status, or baseline age."],
          ["Healing pattern", "Healing may progress unusually fast; healing itself does not cause extra aging."],
          ["Recovery risk", "Early visible improvement does not prove an injury is minor; reassess mechanism, depth, function, and internal injury risk."],
        ],
      },
      {
        title: "Sensory / Communication / Support",
        items: [
          ["Reliable communication", "English only; use short concrete facts and one speaker."],
          ["Stress / panic presentation", "Fragmented answers, distress, or panic are not defiance."],
          ["Known trusted support people", "James, Riley, W.E.A.V.E., Luna, and Leo may help orient without overriding Echo's own answers when she can answer."],
        ],
      },
      {
        title: "Magic Interactions / Do Not Do",
        items: [
          ["Active magic signs", "Echo's own casting can change her apparent age/body read."],
          ["Demonstration caution", "Do not routinely ask Echo to cast or use magic for demonstration or problem-solving."],
          ["Escalate instead", "If she wakes abruptly, cannot provide history, or shows overload/panic climb, reduce sensory load and bring in trusted support if available."],
        ],
      },
    ],
  },
};

const patientOrder = ["luna", "leo", "echo"];

function hashString(value) {
  let hash = 2166136261;
  const input = String(value || "missing-id");
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getQrCells(seed, gridSize = 9) {
  const cells = Array.from({ length: gridSize * gridSize }, () => false);
  let state = hashString(seed);

  function markFinder(startX, startY) {
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        const edge = x === 0 || y === 0 || x === 2 || y === 2;
        const center = x === 1 && y === 1;
        cells[(startY + y) * gridSize + startX + x] = edge || center;
      }
    }
  }

  markFinder(0, 0);
  markFinder(gridSize - 3, 0);
  markFinder(0, gridSize - 3);

  for (let index = 0; index < cells.length; index += 1) {
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);
    const inTopLeft = x < 3 && y < 3;
    const inTopRight = x >= gridSize - 3 && y < 3;
    const inBottomLeft = x < 3 && y >= gridSize - 3;
    if (inTopLeft || inTopRight || inBottomLeft) continue;

    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    cells[index] = (state >>> 0) % 100 < 44;
  }

  return cells;
}

function getCleanSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function runSelfTests() {
  const tests = [
    { name: "has all expected patient cards", pass: patientOrder.every((key) => Boolean(patients[key])) && patientOrder.length === 3 },
    { name: "every patient has scan sections", pass: patientOrder.every((key) => patients[key].fullRecordSections.length >= 4) },
    { name: "every patient has export-safe lookup", pass: patientOrder.every((key) => patients[key].lookup.length > 20 && !patients[key].lookup.includes(" ")) },
    { name: "slug generator strips unsafe characters", pass: getCleanSlug("Echo Poindexter!") === "echo-poindexter" },
    { name: "manual canvas dimensions are positive", pass: CARD_W > 0 && CARD_H > 0 && EXPORT_SCALE >= 2 },
    { name: "QR hash is deterministic", pass: hashString("MRN-TEST") === hashString("MRN-TEST") },
    { name: "QR cells differ by ID", pass: JSON.stringify(getQrCells("A")) !== JSON.stringify(getQrCells("B")) },
  ];

  const failed = tests.filter((test) => !test.pass);
  if (failed.length > 0) console.warn("Species card self-tests failed:", failed.map((test) => test.name));
  else console.info("Species card self-tests passed:", tests.map((test) => test.name));
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRound(ctx, x, y, w, h, r, fill, stroke = null) {
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, options = {}) {
  const words = String(text).split(/\s+/);
  let line = "";
  let lines = [];

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length > maxLines) lines = lines.slice(0, maxLines);

  lines.forEach((entry, index) => {
    let output = entry;
    if (index === maxLines - 1 && words.join(" ").length > lines.join(" ").length) output = `${entry.replace(/[,.]$/, "")}...`;
    ctx.fillText(output, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function setFont(ctx, size, weight = 700, color = "#0f172a") {
  ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = color;
}

function drawLabel(ctx, label, x, y) {
  setFont(ctx, 5.5, 900, "#64748b");
  ctx.letterSpacing = "0px";
  ctx.fillText(label.toUpperCase(), x, y);
}

function drawField(ctx, label, value, x, y, w, h, strong = false) {
  fillRound(ctx, x, y, w, h, 6, "rgba(255,255,255,0.82)", "#e2e8f0");
  drawLabel(ctx, label, x + 6, y + 10);
  setFont(ctx, strong ? 8.8 : 7.4, strong ? 900 : 700, "#0f172a");
  drawWrappedText(ctx, value, x + 6, y + 21, w - 12, strong ? 9.5 : 8.6, 2);
}

function drawCompactRow(ctx, label, value, x, y, w) {
  setFont(ctx, 5.6, 900, "#64748b");
  ctx.fillText(label.toUpperCase(), x, y + 7);
  setFont(ctx, 6.9, 700, "#0f172a");
  drawWrappedText(ctx, value, x + 76, y + 7, w - 80, 8, 2);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 22);
  ctx.lineTo(x + w, y + 22);
  ctx.stroke();
}

function drawQr(ctx, x, y, size = 54, seed = "missing-id") {
  const gridSize = 9;
  const cells = getQrCells(seed, gridSize);
  fillRound(ctx, x, y, size, size, 8, "#ffffff", "#cbd5e1");
  const pad = 5;
  const gap = 1.2;
  const cell = (size - pad * 2 - gap * (gridSize - 1)) / gridSize;

  for (let i = 0; i < cells.length; i += 1) {
    const cx = x + pad + (i % gridSize) * (cell + gap);
    const cy = y + pad + Math.floor(i / gridSize) * (cell + gap);
    ctx.fillStyle = cells[i] ? "#0f172a" : "#f1f5f9";
    ctx.fillRect(cx, cy, cell, cell);
  }
}

function drawCardBackground(ctx, patient, sideTitle) {
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#f8fafc");
  fillRound(ctx, 0, 0, CARD_W, CARD_H, 22, bg, "#cbd5e1");

  const glow1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 180);
  glow1.addColorStop(0, "rgba(20,184,166,0.20)");
  glow1.addColorStop(1, "rgba(20,184,166,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow2 = ctx.createRadialGradient(CARD_W, 0, 0, CARD_W, 0, 170);
  glow2.addColorStop(0, "rgba(59,130,246,0.16)");
  glow2.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.save();
  ctx.globalAlpha = 0.07;
  setFont(ctx, 58, 900, "#0f172a");
  ctx.fillText(patient.initials, CARD_W - 94, CARD_H - 18);
  ctx.restore();

  setFont(ctx, 6, 900, "#047857");
  ctx.fillText("SPECIES HEALTHCARE CARD", 16, 18);
  setFont(ctx, 15, 900, "#0f172a");
  drawWrappedText(ctx, sideTitle, 16, 35, 355, 16, 1);

  fillRound(ctx, CARD_W - 78, 13, 58, 15, 8, "rgba(255,255,255,0.82)", "#cbd5e1");
  setFont(ctx, 6, 900, "#475569");
  ctx.fillText("ER / EMS", CARD_W - 67, 23.5);
}

function drawFrontToCanvas(ctx, patient) {
  drawCardBackground(ctx, patient, `${patient.preferredName} - Immediate Triage`);

  fillRound(ctx, 16, 48, 306, 48, 12, "#ecfdf5", "#6ee7b7");
  drawLabel(ctx, "Primary care flag", 28, 61);
  setFont(ctx, 11, 900, "#064e3b");
  drawWrappedText(ctx, patient.flag, 28, 76, 282, 12, 2);

  const leftX = 16;
  const top = 104;
  const colW = 148;
  const gap = 10;
  drawField(ctx, "Legal", patient.legalName, leftX, top, colW, 38, true);
  drawField(ctx, "Preferred", patient.preferredName, leftX + colW + gap, top, colW, 38, true);
  drawField(ctx, "Pronouns", patient.pronouns, leftX, top + 44, colW, 34);
  drawField(ctx, "DOB / Age", patient.dobAge, leftX + colW + gap, top + 44, colW, 34);
  drawField(ctx, "Sex", patient.sex, leftX, top + 84, colW, 34);
  drawField(ctx, "Gender", patient.gender, leftX + colW + gap, top + 84, colW, 34);

  drawField(ctx, "Species", patient.species, leftX, top + 126, 112, 42, true);
  drawField(ctx, "Profile", patient.profileId, leftX + 122, top + 126, 95, 42);
  drawField(ctx, "Version", patient.version, leftX + 227, top + 126, 95, 42);

  fillRound(ctx, 16, 286, 306, 34, 8, "#fffbeb", "#fde68a");
  setFont(ctx, 7, 800, "#78350f");
  drawWrappedText(ctx, `${patient.identityCaution} Species/patient guidance only; scan for full record.`, 26, 302, 286, 8.4, 2);

  fillRound(ctx, 335, 48, 183, 100, 12, "rgba(255,255,255,0.82)", "#e2e8f0");
  drawLabel(ctx, "Scan / tap", 347, 62);
  setFont(ctx, 5.6, 900, "#64748b");
  ctx.fillText(`NFC ${patient.nfc}`.toUpperCase(), 464, 62);
  drawQr(ctx, 347, 76, 54, patient.healthcareId);
  drawField(ctx, "Lookup", patient.lookup, 410, 76, 96, 30);
  drawField(ctx, "Health ID", patient.healthcareId, 410, 111, 96, 29);

  fillRound(ctx, 335, 156, 183, 164, 12, "rgba(255,255,255,0.82)", "#e2e8f0");
  drawLabel(ctx, "Contacts / issuance", 347, 170);
  drawCompactRow(ctx, "Emergency", patient.emergency, 347, 181, 158);
  drawCompactRow(ctx, "Advocate", patient.advocate, 347, 207, 158);
  drawCompactRow(ctx, "Issued by", patient.issuedBy, 347, 233, 158);
  drawCompactRow(ctx, "Registry", patient.registeredWith, 347, 259, 158);
  drawCompactRow(ctx, "Update", patient.replacement, 347, 285, 158);
}

function drawBackToCanvas(ctx, patient) {
  drawCardBackground(ctx, patient, `${patient.preferredName} - Critical Care Summary`);
  const b = patient.back;

  const leftX = 16;
  const rightX = 274;
  fillRound(ctx, leftX, 48, 242, 51, 12, "#fff1f2", "#fda4af");
  drawLabel(ctx, "Escalate immediately", leftX + 12, 62);
  setFont(ctx, 9.8, 900, "#881337");
  drawWrappedText(ctx, b.escalate, leftX + 12, 78, 218, 10.5, 2);

  fillRound(ctx, leftX, 106, 242, 51, 12, "#fffbeb", "#fcd34d");
  drawLabel(ctx, "Do not dismiss as normal", leftX + 12, 120);
  setFont(ctx, 9, 900, "#78350f");
  drawWrappedText(ctx, b.doNotDismiss, leftX + 12, 136, 218, 10, 2);

  fillRound(ctx, leftX, 164, 242, 51, 12, "#ecfdf5", "#6ee7b7");
  drawLabel(ctx, "Fastest safe response", leftX + 12, 178);
  setFont(ctx, 9, 900, "#064e3b");
  drawWrappedText(ctx, b.firstAction, leftX + 12, 194, 218, 10, 2);

  fillRound(ctx, leftX, 222, 242, 98, 12, "rgba(255,255,255,0.84)", "#cbd5e1");
  drawLabel(ctx, "Hard avoids", leftX + 12, 236);
  setFont(ctx, 8, 900, "#0f172a");
  drawWrappedText(ctx, b.hardAvoids, leftX + 12, 252, 218, 9.2, 4);

  fillRound(ctx, rightX, 48, 244, 185, 12, "rgba(255,255,255,0.84)", "#e2e8f0");
  drawLabel(ctx, "Care modifiers", rightX + 12, 62);
  drawCompactRow(ctx, "Medication", b.meds, rightX + 12, 73, 218);
  drawCompactRow(ctx, "Sedation", b.sedation, rightX + 12, 99, 218);
  drawCompactRow(ctx, "Labs", b.labs, rightX + 12, 125, 218);
  drawCompactRow(ctx, "Imaging", b.imaging, rightX + 12, 151, 218);
  drawCompactRow(ctx, "Sensory", b.sensory, rightX + 12, 177, 218);
  drawCompactRow(ctx, "Handling", b.handling, rightX + 12, 203, 218);

  fillRound(ctx, rightX, 241, 244, 54, 12, "rgba(255,255,255,0.84)", "#e2e8f0");
  drawQr(ctx, rightX + 12, 250, 36, patient.healthcareId);
  drawLabel(ctx, "Full record access", rightX + 58, 254);
  setFont(ctx, 7, 800, "#0f172a");
  drawWrappedText(ctx, "Scan QR, tap NFC, or enter fallback lookup. Registry links to patient-specific notes.", rightX + 58, 268, 170, 8.2, 2);

  fillRound(ctx, rightX, 303, 244, 17, 7, "#f8fafc", "#e2e8f0");
  setFont(ctx, 6.4, 800, "#475569");
  drawWrappedText(ctx, `Record: ${patient.recordType}.`, rightX + 9, 314, 226, 7, 1);
}

function exportCardAsPng(patient, flipped) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W * EXPORT_SCALE;
  canvas.height = CARD_H * EXPORT_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  if (flipped) drawBackToCanvas(ctx, patient);
  else drawFrontToCanvas(ctx, patient);

  const slug = getCleanSlug(patient.preferredName);
  const link = document.createElement("a");
  link.download = `${slug}-species-healthcare-card-${flipped ? "back" : "front"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function TinyLabel({ children }) {
  return <div className="mb-0.5 text-[5px] font-black uppercase tracking-[0.14em] text-slate-500">{children}</div>;
}

function Field({ label, value, strong = false }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-200/80 bg-white/75 px-1.5 py-1">
      <TinyLabel>{label}</TinyLabel>
      <div className={`${strong ? "text-[9px] font-black" : "text-[7.5px] font-semibold"} leading-[1.05] text-slate-950 line-clamp-2`}>{value}</div>
    </div>
  );
}

function CompactRow({ label, value }) {
  return (
    <div className="flex gap-1.5 border-b border-slate-200/80 py-1 last:border-b-0">
      <div className="w-[74px] shrink-0 text-[5.5px] font-black uppercase tracking-[0.11em] text-slate-500">{label}</div>
      <div className="min-w-0 flex-1 text-[7px] font-semibold leading-[1.08] text-slate-950 line-clamp-2">{value}</div>
    </div>
  );
}

function QrMark({ large = false, seed = "missing-id" }) {
  const gridSize = 9;
  const cells = getQrCells(seed, gridSize);
  return (
    <div className={`grid shrink-0 rounded-lg border border-slate-300 bg-white p-1 shadow-inner ${large ? "h-[76px] w-[76px]" : "h-[54px] w-[54px]"}`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, gap: large ? "2px" : "1.5px" }} title={`QR hash seed: ${seed}`}>
      {cells.map((active, i) => (
        <div key={i} className={`rounded-[1px] ${active ? "bg-slate-950" : "bg-slate-100"}`} />
      ))}
    </div>
  );
}

function CardFrame({ side, patient, children }) {
  return (
    <section className="card-face relative h-[336px] w-[534px] overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-2xl print:shadow-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.16),transparent_32%),radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]" />
      <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border-[22px] border-emerald-100/70" />
      <div className="absolute -bottom-14 -left-14 h-44 w-44 rounded-full border-[24px] border-sky-100/70" />
      <div className="absolute right-4 bottom-3 text-[56px] font-black leading-none text-slate-900/5">{patient.initials}</div>
      <div className="relative z-10 flex h-full flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[6px] font-black uppercase tracking-[0.24em] text-emerald-800">Species Healthcare Card</div>
            <h2 className="mt-0.5 text-[15px] font-black leading-none tracking-tight text-slate-950">{side}</h2>
          </div>
          <div className="rounded-full border border-slate-300 bg-white/80 px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.16em] text-slate-600">ER / EMS</div>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

function FrontCard({ patient }) {
  return (
    <CardFrame patient={patient} side={`${patient.preferredName} - Immediate Triage`}>
      <div className="grid h-full grid-cols-[1.25fr_0.75fr] gap-3">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2">
            <TinyLabel>Primary care flag</TinyLabel>
            <div className="text-[12px] font-black leading-[1.05] text-emerald-950 line-clamp-3">{patient.flag}</div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Legal" value={patient.legalName} strong />
            <Field label="Preferred" value={patient.preferredName} strong />
            <Field label="Pronouns" value={patient.pronouns} />
            <Field label="DOB / Age" value={patient.dobAge} />
            <Field label="Sex" value={patient.sex} />
            <Field label="Gender" value={patient.gender} />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Field label="Species" value={patient.species} strong />
            <Field label="Profile" value={patient.profileId} />
            <Field label="Version" value={patient.version} />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[7px] font-bold leading-[1.18] text-amber-950">
            {patient.identityCaution} Species/patient guidance only; scan for full record.
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <div className="rounded-xl border border-slate-200 bg-white/75 p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <TinyLabel>Scan / tap</TinyLabel>
              <span className="text-[5.5px] font-black uppercase tracking-[0.12em] text-slate-500">NFC {patient.nfc}</span>
            </div>
            <div className="flex gap-2">
              <QrMark seed={patient.healthcareId} />
              <div className="min-w-0 flex-1 space-y-1">
                <Field label="Lookup" value={patient.lookup} />
                <Field label="Health ID" value={patient.healthcareId} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/75 p-2">
            <TinyLabel>Contacts / issuance</TinyLabel>
            <div className="space-y-1">
              <CompactRow label="Emergency" value={patient.emergency} />
              <CompactRow label="Advocate" value={patient.advocate} />
              <CompactRow label="Issued by" value={patient.issuedBy} />
              <CompactRow label="Registry" value={patient.registeredWith} />
              <CompactRow label="Update" value={patient.replacement} />
            </div>
          </div>
        </div>
      </div>
    </CardFrame>
  );
}

function BackCard({ patient }) {
  const back = patient.back;
  return (
    <CardFrame patient={patient} side={`${patient.preferredName} - Critical Care Summary`}>
      <div className="grid h-full grid-cols-[1fr_1fr] gap-3">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-2">
            <TinyLabel>Escalate immediately</TinyLabel>
            <div className="text-[10px] font-black leading-[1.08] text-rose-950 line-clamp-3">{back.escalate}</div>
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-2">
            <TinyLabel>Do not dismiss as normal</TinyLabel>
            <div className="text-[9px] font-black leading-[1.08] text-amber-950 line-clamp-3">{back.doNotDismiss}</div>
          </div>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2">
            <TinyLabel>Fastest safe response</TinyLabel>
            <div className="text-[9px] font-black leading-[1.08] text-emerald-950 line-clamp-3">{back.firstAction}</div>
          </div>
          <div className="rounded-xl border border-slate-300 bg-white/75 p-2">
            <TinyLabel>Hard avoids</TinyLabel>
            <div className="text-[8px] font-black leading-[1.08] text-slate-950 line-clamp-3">{back.hardAvoids}</div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-2">
            <TinyLabel>Care modifiers</TinyLabel>
            <CompactRow label="Medication" value={back.meds} />
            <CompactRow label="Sedation" value={back.sedation} />
            <CompactRow label="Labs" value={back.labs} />
            <CompactRow label="Imaging" value={back.imaging} />
            <CompactRow label="Sensory" value={back.sensory} />
            <CompactRow label="Handling" value={back.handling} />
            <CompactRow label="Unknowns" value={back.unknowns} />
          </div>

          <div className="grid grid-cols-[58px_1fr] gap-2 rounded-xl border border-slate-200 bg-white/80 p-2">
            <QrMark seed={patient.healthcareId} />
            <div className="min-w-0">
              <TinyLabel>Full record access</TinyLabel>
              <div className="text-[7px] font-bold leading-[1.12] text-slate-950">Scan QR, tap NFC, or enter fallback lookup. Registry links to patient-specific notes and relevant shared profile.</div>
              <div className="mt-1 rounded-md bg-slate-100 px-1.5 py-1 text-[6.5px] font-black leading-[1.05] text-slate-700 line-clamp-2">{patient.lookup}</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[6.8px] font-bold leading-[1.12] text-slate-700">
            Record: {patient.recordType}. Signature: {patient.signature}.
          </div>
        </div>
      </div>
    </CardFrame>
  );
}

function ToolbarButton({ children, onClick, active = false, title }) {
  return (
    <button title={title} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${active ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-slate-100 hover:bg-white/20"}`}>
      {children}
    </button>
  );
}

function PatientPicker({ selectedKey, onSelect }) {
  return (
    <div className="no-print mb-6 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
        <Users className="h-4 w-4" /> Viewing
      </div>
      <div className="flex flex-wrap gap-2">
        {patientOrder.map((key) => {
          const patient = patients[key];
          const active = selectedKey === key;
          return (
            <button key={key} onClick={() => onSelect(key)} className={`rounded-2xl border px-4 py-3 text-left transition ${active ? "border-emerald-300 bg-emerald-300 text-slate-950" : "border-white/10 bg-white/10 text-slate-100 hover:bg-white/20"}`}>
              <div className="text-sm font-black">{patient.preferredName}</div>
              <div className={`mt-0.5 text-xs font-semibold ${active ? "text-slate-700" : "text-slate-400"}`}>{patient.species}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SharedProfileCard({ patient }) {
  if (patient.species !== "Luminumbra Aasimar-touched") return null;

  return (
    <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:col-span-2">
      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-800">Shared Luminumbra care profile</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Primary flag</div>
          <p className="mt-0.5 text-sm font-semibold leading-5 text-emerald-950">{sharedLuminumbra.primaryFlag}</p>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Pain reflex</div>
          <p className="mt-0.5 text-sm font-semibold leading-5 text-emerald-950">{sharedLuminumbra.pain}</p>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Medication</div>
          <p className="mt-0.5 text-sm font-semibold leading-5 text-emerald-950">{sharedLuminumbra.meds}</p>
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Halo / eye glow</div>
          <p className="mt-0.5 text-sm font-semibold leading-5 text-emerald-950">{sharedLuminumbra.magic}</p>
        </div>
      </div>
    </article>
  );
}

function ScanRecordPanel({ patient, onClose }) {
  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 text-slate-950 shadow-2xl">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              <ShieldAlert className="h-4 w-4" /> DHS Care Registry
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{patient.preferredName} Species Care Record</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{patient.recordType} - Emergency access view</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Close scan</button>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 text-2xl font-black text-emerald-900">{patient.initials}</div>
            <div className="min-w-0">
              <div className="text-lg font-black leading-tight">{patient.preferredName}</div>
              <div className="text-sm font-semibold text-slate-600">{patient.pronouns} - {patient.dobAge}</div>
              <div className="mt-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">{patient.subtype}</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Species</div>
              <div className="font-bold">{patient.species}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Healthcare ID</div>
              <div className="break-all font-bold">{patient.healthcareId}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Support / advocate</div>
              <div className="font-bold">{patient.advocate}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <QrMark large seed={patient.healthcareId} />
            <div className="min-w-0 text-xs font-bold text-slate-600">Registry lookup active. NFC: {patient.nfc}. Fallback code on physical card.</div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">Critical banner</div>
            <div className="mt-1 text-lg font-black leading-snug text-rose-950">{patient.banner}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {patient.fullRecordSections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{section.title}</h3>
                <div className="mt-3 space-y-3">
                  {section.items.map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">{label}</div>
                      <p className="mt-0.5 text-sm font-semibold leading-5 text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            <SharedProfileCard patient={patient} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TwoSidedSpeciesHealthcareCard() {
  const [selectedKey, setSelectedKey] = useState("luna");
  const [flipped, setFlipped] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showScan, setShowScan] = useState(false);
  const [exportError, setExportError] = useState("");
  const patient = useMemo(() => patients[selectedKey], [selectedKey]);

  useEffect(() => {
    runSelfTests();
  }, []);

  function exportPng() {
    setExportError("");
    try {
      exportCardAsPng(patient, flipped);
    } catch (error) {
      console.error("PNG export failed", error);
      setExportError("PNG export failed. This browser could not create a canvas export.");
    }
  }

  function handlePatientSelect(key) {
    setSelectedKey(key);
    setFlipped(false);
    setShowScan(false);
    setExportError("");
  }

  const zoomPercent = Math.round(zoom * 100);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100 print:bg-white print:p-0">
      <style>{`
        .line-clamp-2, .line-clamp-3 { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { -webkit-line-clamp: 2; }
        .line-clamp-3 { -webkit-line-clamp: 3; }
        .flip-scene { perspective: 1400px; }
        .flip-card { transform-style: preserve-3d; transition: transform 650ms cubic-bezier(.2,.8,.2,1); will-change: transform; }
        .card-face { transform: translateZ(0); -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
        .flip-card.is-flipped { transform: rotateY(180deg); }
        .flip-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .flip-back { transform: rotateY(180deg); }
        @media print {
          @page { size: landscape; margin: 12mm; }
          .no-print { display: none !important; }
          main { color: #0f172a; }
          .print-area { transform: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <header className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Interactive card preview</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Species healthcare card viewer</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Pick a person, flip the physical card, zoom the preview, export the current side as PNG, or open the registry scan view.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-white/10 p-2 shadow-lg backdrop-blur">
            <ToolbarButton onClick={() => setFlipped((value) => !value)} title="Flip card">
              <RotateCcw className="h-4 w-4" /> Flip
            </ToolbarButton>
            <ToolbarButton onClick={() => setShowScan((value) => !value)} active={showScan} title="Show scanned record">
              <ScanLine className="h-4 w-4" /> {showScan ? "Hide scan" : "Show scan"}
            </ToolbarButton>
            <ToolbarButton onClick={exportPng} title="Export visible card side to PNG">
              <Download className="h-4 w-4" /> Export PNG
            </ToolbarButton>
          </div>
        </header>

        <PatientPicker selectedKey={selectedKey} onSelect={handlePatientSelect} />

        <section className="no-print mb-6 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Zoom out">
              <Minimize2 className="h-4 w-4" />
            </button>
            <input aria-label="Zoom" type="range" min="0.65" max="1.7" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-64 accent-emerald-300" />
            <button onClick={() => setZoom((z) => Math.min(1.7, Number((z + 0.1).toFixed(2))))} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Zoom in">
              <Maximize2 className="h-4 w-4" />
            </button>
            <button onClick={() => setZoom(1)} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black hover:bg-white/20">{zoomPercent}%</button>
          </div>
          {exportError && <div className="mt-3 rounded-xl border border-rose-300 bg-rose-950/50 px-4 py-2 text-sm font-bold text-rose-100">{exportError}</div>}
        </section>

        <div className="flex justify-center overflow-x-auto overflow-y-visible py-10">
          <div className="print-area flip-scene" style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}>
            <div className={`flip-card relative h-[336px] w-[534px] ${flipped ? "is-flipped" : ""}`}>
              <div className="flip-face absolute inset-0">
                <FrontCard patient={patient} />
              </div>
              <div className="flip-face flip-back absolute inset-0">
                <BackCard patient={patient} />
              </div>
            </div>
          </div>
        </div>

        {showScan && (
          <div className="no-print mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ScanRecordPanel patient={patient} onClose={() => setShowScan(false)} />
          </div>
        )}

        <section className="no-print mx-auto mt-8 max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-5 text-sm leading-6 text-slate-300">
          <h2 className="text-base font-black text-white">Layout intent</h2>
          <p className="mt-2">The plastic card stays sparse and scannable. The scan view carries the longer patient-specific clinical record. PNG export now uses a direct canvas renderer instead of DOM capture, so it avoids Tailwind/html2canvas color parsing issues.</p>
        </section>
      </div>
    </main>
  );
}
