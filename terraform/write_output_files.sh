set -e
mkdir secret/ -p
terraform output key-pem >secret/key.pem
terraform output key-crt >secret/key.crt
terraform output -raw ssh-pri >~/.ssh/ssh
terraform output -raw ssh-pub >~/.ssh/ssh.pub
terraform output -raw ssh-pri | gh secret set ssh
terraform output -raw ssh-pub | gh secret set ssh_pub
rsync -avP secret type:/mnt/
