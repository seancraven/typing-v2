set -e
PEM=$(terraform output -raw key-pem)
CRT=$(terraform output -raw key-crt)
mkdir secret/
echo $PEM >secret/key.pem
echo $CRT >secret/key.crt
rsync -avP secret type:/mnt/secret/
