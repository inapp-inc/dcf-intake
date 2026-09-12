(function () {
  function childRowHtml(i) {
    return (
      "<td><input type=\"text\" name=\"child" +
      i +
      "_name\" placeholder=\"Child name\"></td>" +
      "<td><input type=\"text\" name=\"child" +
      i +
      "_address\" placeholder=\"Current location / address\"></td>" +
      "<td class=\"sexcell\">" +
      "<label><input type=\"checkbox\" name=\"child" +
      i +
      "_male\"> Male</label> " +
      "<label><input type=\"checkbox\" name=\"child" +
      i +
      "_female\"> Female</label>" +
      "</td>" +
      "<td><input type=\"text\" name=\"child" +
      i +
      "_age\" placeholder=\"Age or DOB\"></td>"
    );
  }

  function ensureChildRows() {
    var body = document.getElementById("childrenBody");
    if (!body) return;
    if (body.querySelector("tr")) return;
    for (var i = 1; i <= 5; i++) {
      var tr = document.createElement("tr");
      tr.innerHTML = childRowHtml(i);
      body.appendChild(tr);
    }
  }

  function setField(name, val) {
    var el = document.querySelector('[name="' + name + '"]');
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!val;
    else if (val != null && val !== "") el.value = String(val);
  }

  function applyFillData() {
    var dataEl = document.getElementById("fill-data");
    if (!dataEl) return;
    try {
      var data = JSON.parse(dataEl.textContent || "{}");
      Object.keys(data).forEach(function (name) {
        setField(name, data[name]);
      });
    } catch (_e) {
      /* ignore malformed fill payload */
    }
  }

  function collectFields() {
    var fields = {};
    document.querySelectorAll("input, textarea").forEach(function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") fields[el.name] = el.checked;
      else fields[el.name] = el.value;
    });
    return fields;
  }

  function getAccessToken() {
    var params = new URLSearchParams(window.location.search);
    return params.get("access_token") || "";
  }

  function setSaveStatus(message, ok) {
    var status = document.getElementById("save-status");
    if (!status) return;
    status.textContent = message;
    status.style.color = ok ? "#1a7f4b" : "#b42318";
  }

  function saveForm(andPrint) {
    var metaEl = document.getElementById("form-meta");
    var meta = {};
    if (metaEl) {
      try {
        meta = JSON.parse(metaEl.textContent || "{}");
      } catch (_e) {
        meta = {};
      }
    }
    var saveUrl = meta.saveUrl;
    if (!saveUrl) {
      setSaveStatus("Save URL not configured", false);
      return;
    }
    var token = getAccessToken();
    setSaveStatus("Saving…", true);
    fetch(saveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ fields: collectFields() }),
    })
      .then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            throw new Error(t || "Save failed (" + r.status + ")");
          });
        }
        return r.json();
      })
      .then(function () {
        setSaveStatus("Saved", true);
        if (andPrint) window.print();
      })
      .catch(function (e) {
        setSaveStatus("Save failed", false);
        window.alert("Could not save form: " + (e.message || "unknown error"));
      });
  }

  ensureChildRows();
  applyFillData();

  document.getElementById("btn-save-form")?.addEventListener("click", function () {
    saveForm(false);
  });

  document.getElementById("btn-save-print-form")?.addEventListener("click", function () {
    saveForm(true);
  });
})();
