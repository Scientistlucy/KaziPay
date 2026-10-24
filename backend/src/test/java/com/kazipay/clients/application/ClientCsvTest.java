package com.kazipay.clients.application;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ClientCsvTest {
    @Test
    void parsesQuotedFieldsWithCommasQuotesAndLineBreaks() {
        var records = ClientCsv.parse("name,address\r\n\"Acme, Ltd\",\"Moi Ave\nNairobi\"\n\"The \"\"Best\"\" Co\",\n");

        assertThat(records).containsExactly(
                List.of("name", "address"),
                List.of("Acme, Ltd", "Moi Ave\nNairobi"),
                List.of("The \"Best\" Co", ""));
    }

    @Test
    void skipsBlankLines() {
        assertThat(ClientCsv.parse("name\n\nAcme\n\n")).containsExactly(List.of("name"), List.of("Acme"));
    }

    @Test
    void exportedRowsParseBackToTheSameValues() {
        var values = Arrays.asList("Wanjiru & Co, Advocates", null, "a@b.co", "+254 700 000000", null,
                "Kimathi St, \"Floor 3\"", "Kenya", null, "KES", "Pays on the 5th");

        var parsed = ClientCsv.parse(ClientCsv.row(values)).get(0);

        assertThat(parsed).containsExactly("Wanjiru & Co, Advocates", "", "a@b.co", "+254 700 000000", "",
                "Kimathi St, \"Floor 3\"", "Kenya", "", "KES", "Pays on the 5th");
    }

    @Test
    void headerLookupIsCaseInsensitiveAndRequiresName() {
        assertThat(ClientCsv.headerIndex(List.of("Email", " NAME "))).containsEntry("name", 1).containsEntry("email", 0);
        assertThatThrownBy(() -> ClientCsv.headerIndex(List.of("email", "phone")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name column");
    }

    @Test
    void rejectsUnterminatedQuotes() {
        assertThatThrownBy(() -> ClientCsv.parse("name\n\"Acme"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
