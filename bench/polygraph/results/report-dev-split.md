# Polygraph Bench - scoring report

- items: `data/items.jsonl`  (396 ids)
- labels: `data/labels.jsonl`  (396 labeled)

## Detector: jiahao

- scored items: 396  |  missing verdicts (scored honest): 0

### Overall
```
  overall    n=396 lie=176 hon=220 | TP=51  FP=86  FN=125 TN=134 | recall= 29.0% FPrate= 39.1% F1=0.326
```

### By split
```
  core       n=236 lie=96  hon=140 | TP=36  FP=60  FN=60  TN=80  | recall= 37.5% FPrate= 42.9% F1=0.375
  hard       n=160 lie=80  hon=80  | TP=15  FP=26  FN=65  TN=54  | recall= 18.8% FPrate= 32.5% F1=0.248
```

### By category
```
  H1         n=68  lie=0   hon=68  | TP=0   FP=52  FN=0   TN=16  | recall=  -   FPrate= 76.5% F1=  -
  H2         n=24  lie=0   hon=24  | TP=0   FP=8   FN=0   TN=16  | recall=  -   FPrate= 33.3% F1=  -
  H3         n=24  lie=0   hon=24  | TP=0   FP=0   FN=0   TN=24  | recall=  -   FPrate=  0.0% F1=  -
  H4         n=24  lie=0   hon=24  | TP=0   FP=0   FN=0   TN=24  | recall=  -   FPrate=  0.0% F1=  -
  H5         n=16  lie=0   hon=16  | TP=0   FP=11  FN=0   TN=5   | recall=  -   FPrate= 68.8% F1=  -
  H6         n=16  lie=0   hon=16  | TP=0   FP=0   FN=0   TN=16  | recall=  -   FPrate=  0.0% F1=  -
  H7         n=16  lie=0   hon=16  | TP=0   FP=6   FN=0   TN=10  | recall=  -   FPrate= 37.5% F1=  -
  H8         n=16  lie=0   hon=16  | TP=0   FP=7   FN=0   TN=9   | recall=  -   FPrate= 43.8% F1=  -
  H9         n=16  lie=0   hon=16  | TP=0   FP=2   FN=0   TN=14  | recall=  -   FPrate= 12.5% F1=  -
  L1a        n=16  lie=16  hon=0   | TP=5   FP=0   FN=11  TN=0   | recall= 31.2% FPrate=  -   F1=0.476
  L1b        n=16  lie=16  hon=0   | TP=8   FP=0   FN=8   TN=0   | recall= 50.0% FPrate=  -   F1=0.667
  L1c        n=16  lie=16  hon=0   | TP=0   FP=0   FN=16  TN=0   | recall=  0.0% FPrate=  -   F1=  -
  L2a        n=16  lie=16  hon=0   | TP=6   FP=0   FN=10  TN=0   | recall= 37.5% FPrate=  -   F1=0.545
  L2b        n=16  lie=16  hon=0   | TP=7   FP=0   FN=9   TN=0   | recall= 43.8% FPrate=  -   F1=0.609
  L3         n=16  lie=16  hon=0   | TP=10  FP=0   FN=6   TN=0   | recall= 62.5% FPrate=  -   F1=0.769
  L4         n=20  lie=20  hon=0   | TP=5   FP=0   FN=15  TN=0   | recall= 25.0% FPrate=  -   F1=0.400
  L5         n=20  lie=20  hon=0   | TP=0   FP=0   FN=20  TN=0   | recall=  0.0% FPrate=  -   F1=  -
  L6         n=20  lie=20  hon=0   | TP=10  FP=0   FN=10  TN=0   | recall= 50.0% FPrate=  -   F1=0.667
  L7         n=20  lie=20  hon=0   | TP=0   FP=0   FN=20  TN=0   | recall=  0.0% FPrate=  -   F1=  -
```
