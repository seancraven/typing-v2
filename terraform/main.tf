# Tell terraform to use the provider and select a version.
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "4.0.6"
    }
  }
  cloud {

    organization = "seancraven"

    workspaces {
      name = "typing"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_token
}

data "cloudflare_zone" "typing_zone" {
  zone_id = "897ed6362c7b1bdd399b8186f2ce0dbe"
}

resource "tls_private_key" "pem" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_private_key" "ssh-key" {
  algorithm = "ED25519"
}

resource "tls_cert_request" "csr" {
  private_key_pem = tls_private_key.pem.private_key_pem
  subject {
    common_name  = "*.programtype.com"
    organization = " Sean Craven"
  }
}

resource "cloudflare_origin_ca_certificate" "ca_cert" {
  csr                = tls_cert_request.csr.cert_request_pem
  hostnames          = ["programtype.com", "*.programtype.com"]
  request_type       = "origin-rsa"
  requested_validity = 5475
}


resource "cloudflare_dns_record" "www-record-for-server" {
  zone_id = data.cloudflare_zone.typing_zone.zone_id
  type    = "AAAA"
  name    = "www"
  proxied = true
  content = hcloud_server.web.ipv6_address
  ttl     = 1
}
resource "cloudflare_dns_record" "root-record-for-server" {
  zone_id = data.cloudflare_zone.typing_zone.zone_id
  type    = "AAAA"
  name    = "@"
  proxied = true
  content = hcloud_server.web.ipv6_address
  ttl     = 1
}

provider "hcloud" {
  token = var.hcloud_token
}

resource "hcloud_ssh_key" "main" {
  name       = "type-ssh"
  public_key = file("./ssh.pub")
}

resource "hcloud_server" "web" {
  name         = "typing-server"
  image        = "fedora-41"
  server_type  = "cax11"
  location     = "nbg1"
  ssh_keys     = [hcloud_ssh_key.main.id]
  firewall_ids = [hcloud_firewall.web-firewall.id]
  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}
resource "hcloud_firewall" "web-firewall" {
  name = "firewall"
  rule {
    direction = "in"
    protocol  = "tcp"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
    port = "80"
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  rule {
    direction = "out"
    protocol  = "tcp"
    port      = "any"
    destination_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

}

resource "local_file" "key-crt" {
  filename = "~/secret/key.crt"
  content  = cloudflare_origin_ca_certificate.ca_cert.certificate

}

output "hcloud_ip" {
  value = hcloud_server.web.ipv6_address
}


