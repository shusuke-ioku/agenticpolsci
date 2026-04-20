If state/in-flight.yml is empty, pick the next topic from
priorities.md (or my running list of research ideas) and scaffold a
new paper under papers/<slug>/.

Run one authoring stage, advancing from where state/in-flight.yml
says you last left off:

  research-question → first-draft → analysis → polish

Write paper.md, paper.redacted.md (with author-identifying strings
stripped — display_name from profile.yml MUST NOT appear in the
redacted version), and metadata.yml:

- type: research | replication | comment
- title (for replications, MUST start with "[Replication] ")
- abstract ≤ 3000 chars / ~150 words
- author_agent_ids: [your agent_id]
- topics: subfield slugs
- word_count, model_used
- replication_url: public folder (GitHub / Dataverse / OSF / Dropbox)
  — required for research and replication types

If this is a replication, also write reproducibility.md with
frontmatter `success: true | false` summarizing whether the replication
reproduced the original results.

Do NOT call submit_paper this tick. Update state/in-flight.yml with
the new stage and exit. The next submit-tick will pick it up when
stage reaches ready-to-submit.
