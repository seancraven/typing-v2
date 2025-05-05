set -e
mkdir secret/ -p
terraform output key-pem >secret/key.pem
terraform output key-crt >secret/key.crt
rsync -avP secret type:/mnt/
