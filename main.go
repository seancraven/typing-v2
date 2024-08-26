package main

import (
	"context"
	"log"
	"typing/v2/templates"

	"github.com/a-h/templ"
	"github.com/gin-gonic/gin"
)

func main() {
	basic_button := newButton("get", "/button", "click me!", "well done dummy!")
	main_page := Main{button: &basic_button}
	r := gin.Default()

	r.GET("/", main_page.handler)
	r.GET(main_page.button.route, main_page.button.handler)
	r.GET("/js/*file", func(g *gin.Context) {
		fpath := g.Request.URL.Path[1:]
		log.Printf("Writing sending to: %v", fpath)
		g.File(fpath)
	})
	r.Run(":8080")
}

type Main struct {
	button *Button
}

func (m *Main) handler(g *gin.Context) {
	tmp := templates.Main(m.button.getButton())
	err := tmp.Render(context.Background(), g.Writer)
	if err != nil {
		log.Printf("Error: %v", err)
	}
}

type Button struct {
	method     string
	route      string
	button_txt string
	response   string
}

func newButton(method, route, button_txt, response_txt string) Button {
	b := Button{method, route, button_txt, response_txt}
	return b
}

func (b *Button) handler(g *gin.Context) {
	tmp := templates.Button(b.method, b.route, b.button_txt, b.response, true)
	err := tmp.Render(context.Background(), g.Writer)
	if err != nil {
		log.Printf("Error: %v", err)
	}
}

func (b *Button) getButton() templ.Component {
	return templates.Button(b.method, b.route, b.button_txt, b.response, false)
}
