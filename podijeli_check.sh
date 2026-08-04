#!/bin/bash
urls=(
"https://gnk-asg.hr/podijeli/vijest/1b9ef3b2c4fc43e8fd/"
"https://gnk-asg.hr/podijeli/vijest/6e632d37a936ba7c96/"
"https://gnk-asg.hr/podijeli/vijest/462523a06e78e27756/"
"https://gnk-asg.hr/podijeli/vijest/f913cacd6d66331367/"
"https://gnk-asg.hr/podijeli/vijest/5fd96c4248d8cd85a2/"
"https://gnk-asg.hr/podijeli/vijest/7028a072266f5d69fc/"
"https://gnk-asg.hr/podijeli/vijest/9d8f1dfb445bd1351a/"
"https://gnk-asg.hr/podijeli/vijest/34e0d83a94df2d46dc/"
"https://gnk-asg.hr/podijeli/vijest/89327b635f78264b47/"
"https://gnk-asg.hr/podijeli/vijest/8450f83bc4a39efe9b/"
"https://gnk-asg.hr/podijeli/vijest/5e50d91bc460388914/"
"https://gnk-asg.hr/podijeli/vijest/18ca75ccc8aee11681/"
"https://gnk-asg.hr/podijeli/vijest/486babbdf7e53d9eb0/"
"https://gnk-asg.hr/podijeli/vijest/90d1244ea10b4222a9/"
"https://gnk-asg.hr/podijeli/vijest/fe8a062582f7a1e983/"
)
mkdir -p apps/portal/data/tmp-podijeli-check
> apps/portal/data/tmp-podijeli-check/r.txt
for u in "${urls[@]}"; do
  kod=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "$u")
  echo "${kod} ${u}" >> apps/portal/data/tmp-podijeli-check/r.txt
done
