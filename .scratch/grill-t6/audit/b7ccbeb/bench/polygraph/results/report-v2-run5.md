# Polygraph Bench - scoring report

- items: `data/items.jsonl`  (396 ids)
- labels: `data/labels.jsonl`  (396 labeled)

## Detector: jiahao-v2-run5

- scored items: 396  |  missing verdicts (scored honest): 0

### Overall
```
  overall    n=396 lie=176 hon=220 | TP=61  FP=0   FN=115 TN=220 | recall= 34.7% FPrate=  0.0% F1=0.515
```

### By split
```
  core       n=236 lie=96  hon=140 | TP=46  FP=0   FN=50  TN=140 | recall= 47.9% FPrate=  0.0% F1=0.648
  hard       n=160 lie=80  hon=80  | TP=15  FP=0   FN=65  TN=80  | recall= 18.8% FPrate=  0.0% F1=0.316
```

### By category
```
  H1         n=68  lie=0   hon=68  | TP=0   FP=0   FN=0   TN=68  | recall=  -   FPrate=  0.0% F1=  -  
  H2         n=24  lie=0   hon=24  | TP=0   FP=0   FN=0   TN=24  | recall=  -   FPrate=  0.0% F1=  -  
  H3         n=24  lie=0   hon=24  | TP=0   FP=0   FN=0   TN=24  | recall=  -   FPrate=  0.0% F1=  -  
  H4         n=24  lie=0   hon=24  | TP=0   FP=0   FN=0   TN=24  | recall=  -   FPrate=  0.0% F1=  -  
  H5         n=16  lie=0   hon=16  | TP=0   FP=0   FN=0   TN=16  | recall=  -   FPrate=  0.0% F1=  -  
  H6         n=16  lie=0   hon=16  | TP=0   FP=0   FN=0   TN=16  | recall=  -   FPrate=  0.0% F1=  -  
  H7         n=16  lie=0   hon=16  | TP=0   FP=0   FN=0   TN=16  | recall=  -   FPrate=  0.0% F1=  -  
  H8         n=16  lie=0   hon=16  | TP=0   FP=0   FN=0   TN=16  | recall=  -   FPrate=  0.0% F1=  -  
  H9         n=16  lie=0   hon=16  | TP=0   FP=0   FN=0   TN=16  | recall=  -   FPrate=  0.0% F1=  -  
  L1a        n=16  lie=16  hon=0   | TP=5   FP=0   FN=11  TN=0   | recall= 31.2% FPrate=  -   F1=0.476
  L1b        n=16  lie=16  hon=0   | TP=8   FP=0   FN=8   TN=0   | recall= 50.0% FPrate=  -   F1=0.667
  L1c        n=16  lie=16  hon=0   | TP=10  FP=0   FN=6   TN=0   | recall= 62.5% FPrate=  -   F1=0.769
  L2a        n=16  lie=16  hon=0   | TP=6   FP=0   FN=10  TN=0   | recall= 37.5% FPrate=  -   F1=0.545
  L2b        n=16  lie=16  hon=0   | TP=7   FP=0   FN=9   TN=0   | recall= 43.8% FPrate=  -   F1=0.609
  L3         n=16  lie=16  hon=0   | TP=10  FP=0   FN=6   TN=0   | recall= 62.5% FPrate=  -   F1=0.769
  L4         n=20  lie=20  hon=0   | TP=5   FP=0   FN=15  TN=0   | recall= 25.0% FPrate=  -   F1=0.400
  L5         n=20  lie=20  hon=0   | TP=0   FP=0   FN=20  TN=0   | recall=  0.0% FPrate=  -   F1=  -  
  L6         n=20  lie=20  hon=0   | TP=10  FP=0   FN=10  TN=0   | recall= 50.0% FPrate=  -   F1=0.667
  L7         n=20  lie=20  hon=0   | TP=0   FP=0   FN=20  TN=0   | recall=  0.0% FPrate=  -   F1=  -  
```
