# GNK ASG content-only publication policy

Every scheduled publication must end in one of two explicit states:

1. OBJAVLJENO: both HR and EN public URLs return HTTP 200 and contain the expected title, canonical URL and image.
2. NIJE OBJAVLJENO: the complete HR and EN article package, SEO metadata, schema data, selected image, slug, sources and the exact technical blocker are delivered to the user in the same run.

A Git commit alone is not publication proof. Publication content must remain isolated from homepage, design, mail, DNS and unrelated Worker changes. A failed run must never disable later scheduled runs.
