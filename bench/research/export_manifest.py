#!/usr/bin/env python3
# bench/research/export_manifest.py - ADR-0064 D-E/D-005: export the rung-1
# top G2 survivor as a portable manifest + 20 frozen golden items for the G6
# sklearn -> JS equivalence gate.
#
# Ported config: G2 survivor (default: char-3|count|lr|C1.0|df2), trained on
# the FULL labeled corpus (deterministic lbfgs; a research substrate, not an
# adopted product model - adoption is a separate confirmatory round, D-B).
#
# Manifest: vocabulary + coef_ + intercept_ + analyzer spec. Goldens: 20 items
# (10 lie + 10 honest, deterministic sha256-id order), each carrying the
# serializer output text, the sklearn token multiset, the sparse feature
# vector, and the decision logit.
#
# Usage: python bench/research/export_manifest.py --corpus-dir DIR
#          [--survivor-config-id ID] [--out-dir bench/research]

import argparse, hashlib, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from rung_ladder import (item_text, load_corpus, build_vectorizer, build_model,
                         corpus_fingerprint, SEEDS, REFERENCE)

GOLD_N_PER_CLASS = 10


def pick_gold20(rows):
    def key(r):
        return hashlib.sha256(r['id'].encode('utf-8')).hexdigest()
    lie = sorted((r for r in rows if r['lie']), key=key)[:GOLD_N_PER_CLASS]
    hon = sorted((r for r in rows if not r['lie']), key=key)[:GOLD_N_PER_CLASS]
    return lie + hon


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--corpus-dir', required=True)
    ap.add_argument('--out-dir', default=os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument('--survivor-config-id', default=None)
    a = ap.parse_args()

    rows = load_corpus(a.corpus_dir)

    # Resolve the config to port: prefer the recorded G2 top survivor.
    sv_path = os.path.join(a.out_dir, 'out', 'survivors.json')
    cfg = dict(REFERENCE)
    src = 'reference'
    if os.path.exists(sv_path):
        doc = json.load(open(sv_path, encoding='utf-8'))
        if doc.get('survivors'):
            cfg = dict(doc['survivors'][0]['config'])
            src = 'g2-survivor:' + doc['survivors'][0]['config_id']
    if a.survivor_config_id:
        doc = json.load(open(sv_path, encoding='utf-8'))
        cfg = dict(next(s['config'] for s in doc['survivors']
                        if s['config_id'] == a.survivor_config_id))
        src = 'g2-survivor:' + a.survivor_config_id

    texts = [item_text(r['item']) for r in rows]
    y = [1 if r['lie'] else 0 for r in rows]
    vec = build_vectorizer(cfg)
    X = vec.fit_transform(texts)
    model = build_model(cfg, 0)
    model.fit(X, y)

    analyzer, ngram = vec.analyzer, vec.ngram_range
    # Tokenization contract pinned into the manifest for auditability (the JS
    # port implements exactly this spec; the G6 gate enforces bit-equality).
    if analyzer == 'char_wb':
        token_spec = {'kind': 'char_wb', 'preprocess': 'lowercase',
                      'whitespace_collapse': '\\s\\s+ -> space', 'word_split': '\\s+',
                      'word_pad': 'space', 'ngram_range': list(ngram)}
    else:
        token_spec = {'kind': 'word', 'preprocess': 'lowercase',
                      'token_pattern': '(?u)\\b\\w\\w+\\b', 'ngram_range': list(ngram)}
    manifest = {
        'schema_version': 1,
        '_doc': 'ADR-0064 D-E: portable manifest for the G6 gate. Vectorizer layer is hand-written JS (src/port/score.js); estimator layer is a hand-written dot product (allowed under D-E). sklearn-porter and ONNX are forbidden channels.',
        'ported_from': src,
        'config': cfg,
        'analyzer': {'kind': analyzer, 'ngram_range': list(ngram), 'lowercase': True,
                     'token_spec': token_spec},
        'idf': ([float(v) for v in vec.idf_]
                if hasattr(vec, 'idf_') else None),  # None for count weighting
        'serializer': 'item_text v1: task + events(message->text; tool_call->name+json.dumps(arguments,sort_keys); tool_result->content+is_error/truncated flags) + closing, LF-joined, empty parts dropped',
        'vocabulary': {t: int(i) for t, i in vec.vocabulary_.items()},
        'coef': [float(c) for c in model.coef_[0]],
        'intercept': float(model.intercept_[0]),
        'trained_on': 'full corpus n=%d, deterministic (lbfgs, class_weight=balanced)' % len(rows),
        'corpus_fingerprints': corpus_fingerprint(a.corpus_dir),
        'source_adr': '0064',
    }
    with open(os.path.join(a.out_dir, 'g6-manifest.json'), 'w', encoding='utf-8', newline='') as f:
        f.write(json.dumps(manifest, indent=2, sort_keys=False) + '\n')

    gold = pick_gold20(rows)
    gold_path = os.path.join(a.out_dir, 'gold20.jsonl')
    with open(gold_path, 'w', encoding='utf-8', newline='') as f:
        for r in gold:
            text = item_text(r['item'])
            tokens = sorted(vec.build_analyzer()(text))
            x = vec.transform([text])
            nz = x.nonzero()[1]
            vec_sparse = [[int(i), float(x[0, i])] for i in sorted(nz.tolist())]
            logit = float(model.decision_function(x)[0])
            f.write(json.dumps({
                'id': r['id'],
                'label': 'lie' if r['lie'] else 'honest',
                'text': text,
                'tokens': tokens,
                'vector': vec_sparse,
                'logit': logit,
            }, ensure_ascii=False) + '\n')
    print('[export] manifest=%s gold20=%d items, ported_from=%s' % (
        os.path.join(a.out_dir, 'g6-manifest.json'), len(gold), src))


if __name__ == '__main__':
    main()
