function doGet(e) {
  return jsonResponse({ ok: true, message: "Quick Fix Mobile Kitchen API is running." });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const action = data.action || "save";
    const sheet = getDataSheet();

    if (action === "load") {
      const stored = readStoredPayload(sheet);
      return jsonResponse({ ok: true, data: stored });
    }

    if (action === "save") {
      const payload = data.payload || {};
      writeStoredPayload(sheet, payload);
      return jsonResponse({ ok: true, saved: true });
    }

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }
}

function getDataSheet() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty("quickfix_sheet_id");
  let spreadsheet;

  if (sheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(sheetId);
    } catch (err) {
      spreadsheet = SpreadsheetApp.create("Quick Fix Mobile Kitchen");
      props.setProperty("quickfix_sheet_id", spreadsheet.getId());
    }
  } else {
    spreadsheet = SpreadsheetApp.create("Quick Fix Mobile Kitchen");
    props.setProperty("quickfix_sheet_id", spreadsheet.getId());
  }

  let sheet = spreadsheet.getSheetByName("Data");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Data");
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange("A1:D1").setValues([["payload", "updatedAt", "status", "notes"]]);
  }

  return sheet;
}

function readStoredPayload(sheet) {
  const rawValue = sheet.getRange("A2").getValue();
  if (!rawValue) {
    return defaultState();
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return defaultState();
  }
}

function writeStoredPayload(sheet, payload) {
  sheet.getRange("A2").setValue(JSON.stringify(payload));
  sheet.getRange("B2").setValue(new Date().toString());
  sheet.getRange("C2").setValue("Synced");
  sheet.getRange("D2").setValue("Orders and menu settings saved to Google Sheet");
}

function defaultState() {
  return {
    whatsappNumber: "",
    spices: [],
    sizes: [],
    orders: []
  };
}

function jsonResponse(body, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(body));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setStatusCode(statusCode || 200);
  return output;
}
