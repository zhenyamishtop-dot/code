using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание3
{
    public partial class Form1 : Form
    {
        Lunch lunch = new Lunch("Суп-лапша", 150, "Плов", 240, "Морс", 70);

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            textBox1.Text = lunch.Dish1;
            textBox2.Text = lunch.Dish2;
            textBox3.Text = lunch.Dish3;
            textBox4.Text = lunch.Price1.ToString();
            textBox5.Text = lunch.Price2.ToString();
            textBox6.Text = lunch.Price3.ToString();
            ShowState();
        }

        private double ReadPrice(TextBox tb)
        {
            double x;
            if (double.TryParse(tb.Text, out x) == false || x < 0)
                x = 0;
            return x;
        }

        private void ShowState()
        {
            textBox9.Text = lunch.ToString();
            textBox7.Text = "";
            textBox8.Text = "";
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            lunch.Dish1 = textBox1.Text;
            ShowState();
        }

        private void textBox2_TextChanged(object sender, EventArgs e)
        {
            lunch.Dish2 = textBox2.Text;
            ShowState();
        }

        private void textBox3_TextChanged(object sender, EventArgs e)
        {
            lunch.Dish3 = textBox3.Text;
            ShowState();
        }

        private void textBox4_TextChanged(object sender, EventArgs e)
        {
            lunch.Price1 = ReadPrice(textBox4);
            ShowState();
        }

        private void textBox5_TextChanged(object sender, EventArgs e)
        {
            lunch.Price2 = ReadPrice(textBox5);
            ShowState();
        }

        private void textBox6_TextChanged(object sender, EventArgs e)
        {
            lunch.Price3 = ReadPrice(textBox6);
            ShowState();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            textBox7.Text = lunch.TotalCost().ToString() + " руб.";
        }

        private void button2_Click(object sender, EventArgs e)
        {
            textBox8.Text = lunch.CostWithDiscount().ToString("0.00") + " руб.";
        }
    }
}
