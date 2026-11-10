import gzip
import json
import csv

INPUT_FILE = "ol_dump_works_latest.txt.gz"
OUTPUT_FILE = "openlibrary_ebooks_italian.csv"

with gzip.open(INPUT_FILE, "rt", encoding="utf-8") as fin, \
     open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as fout:

    writer = csv.writer(fout)
    writer.writerow([
        "title",
        "authors",
        "publish_date",
        "isbn_10",
        "isbn_13",
        "openlibrary_key"
    ])

    for line in fin:
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue

        # filtro lingua italiana
        langs = data.get("languages", [])
        if not any(l.get("key") == "/languages/ita" for l in langs):
            continue

        title = data.get("title", "")

        authors = []
        for a in data.get("authors", []):
            key = a.get("author", {}).get("key", "")
            if key:
                authors.append(key)
        authors = ";".join(authors)

        publish_date = data.get("first_publish_date", "")

        isbns = data.get("isbn", [])
        isbn_10 = ";".join([i for i in isbns if len(i) == 10])
        isbn_13 = ";".join([i for i in isbns if len(i) == 13])

        writer.writerow([
            title,
            authors,
            publish_date,
            isbn_10,
            isbn_13,
            data.get("key", "")
        ])
