package com.kazipay.clients.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Minimal RFC 4180 reader/writer for client import and export. */
final class ClientCsv {
    static final List<String> COLUMNS = List.of("name", "company", "email", "phone", "billingEmail", "address",
            "country", "taxId", "defaultCurrency", "notes");

    private ClientCsv() { }

    /** Parses quoted fields, escaped quotes ("") and line breaks inside quotes. Blank lines are skipped. */
    static List<List<String>> parse(String csv) {
        var records = new ArrayList<List<String>>();
        var record = new ArrayList<String>();
        var field = new StringBuilder();
        var quoted = false;
        for (var i = 0; i < csv.length(); i++) {
            var c = csv.charAt(i);
            if (quoted) {
                if (c == '"' && i + 1 < csv.length() && csv.charAt(i + 1) == '"') { field.append('"'); i++; }
                else if (c == '"') quoted = false;
                else field.append(c);
            } else if (c == '"') {
                quoted = true;
            } else if (c == ',') {
                record.add(field.toString()); field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < csv.length() && csv.charAt(i + 1) == '\n') i++;
                endRecord(records, record, field);
                record = new ArrayList<>();
            } else {
                field.append(c);
            }
        }
        if (quoted) throw new IllegalArgumentException("CSV has an unterminated quoted field");
        endRecord(records, record, field);
        return records;
    }

    /** Maps header names (case-insensitive) to column positions and rejects files without a name column. */
    static Map<String, Integer> headerIndex(List<String> header) {
        var index = new java.util.HashMap<String, Integer>();
        for (var i = 0; i < header.size(); i++) index.putIfAbsent(header.get(i).trim().toLowerCase(Locale.ROOT), i);
        if (!index.containsKey("name")) throw new IllegalArgumentException("CSV header must include a name column");
        return index;
    }

    static String row(List<String> values) {
        return values.stream().map(ClientCsv::quote).collect(Collectors.joining(",")) + "\n";
    }

    private static void endRecord(List<List<String>> records, List<String> record, StringBuilder field) {
        record.add(field.toString());
        field.setLength(0);
        if (!(record.size() == 1 && record.get(0).isBlank())) records.add(record);
    }

    private static String quote(String value) {
        return value == null ? "" : "\"" + value.replace("\"", "\"\"") + "\"";
    }
}
